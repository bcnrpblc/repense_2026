import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncTeachersActiveStatus } from '@/lib/teacherStatus';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateClassSchema = z.object({
  capacidade: z.number().int().min(1).max(100).optional(),
  eh_ativo: z.boolean().optional(),
  teacher_id: z.union([z.string().min(1), z.null()]).optional(),
  link_whatsapp: z.union([z.string().url(), z.string().length(0), z.null()]).optional(),
  horario: z.string().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  numero_sessoes: z.number().int().min(1).max(20).optional(),
});

// ============================================================================
// GET /api/admin/classes/[id]
// ============================================================================

/**
 * Get a single class by ID with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    const classData = await prisma.class.findUnique({
      where: { id: params.id },
      include: {
        Teacher: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            Session: true,
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    // Include final_report fields
    const response = {
      ...classData,
      final_report: classData.final_report,
      final_report_em: classData.final_report_em,
    };

    return NextResponse.json({ class: response });

  } catch (error) {
    console.error('Error fetching class:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/admin/classes/[id]
// ============================================================================

/**
 * Update a class
 * Supports: capacidade, eh_ativo, teacher_id, link_whatsapp, horario, data_inicio, numero_sessoes
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const data = updateClassSchema.parse(body);

    // Get current class data
    const currentClass = await prisma.class.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        numero_inscritos: true,
        capacidade: true,
        teacher_id: true,
        eh_ativo: true,
        link_whatsapp: true,
      },
    });

    if (!currentClass) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    // Validate capacidade >= numero_inscritos
    if (data.capacidade !== undefined) {
      if (data.capacidade < currentClass.numero_inscritos) {
        return NextResponse.json(
          { 
            error: `Capacidade não pode ser menor que o número de inscritos (${currentClass.numero_inscritos})` 
          },
          { status: 400 }
        );
      }
    }

    // Determine final active status after update
    const nextEhAtivo =
      data.eh_ativo !== undefined ? data.eh_ativo : currentClass.eh_ativo;

    // Validate teacher_id if provided
    if (data.teacher_id !== undefined && data.teacher_id !== null) {
      // Check if teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { id: data.teacher_id },
        select: { id: true, nome: true, eh_ativo: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: 'Professor não encontrado' },
          { status: 400 }
        );
      }

      // Check if teacher is active
      if (!teacher.eh_ativo) {
        return NextResponse.json(
          { error: 'Professor está inativo' },
          { status: 400 }
        );
      }

      // Regra: Professor pode ter no máximo 1 turma ativa (eh_ativo = true, arquivada = false).
      // Só validamos essa regra se a turma estiver (ou for ficar) ativa.
      if (nextEhAtivo) {
        const activeClassCount = await prisma.class.count({
          where: {
            teacher_id: data.teacher_id,
            eh_ativo: true,
            arquivada: false,
            id: { not: params.id }, // Exclui a própria turma
          },
        });

        if (activeClassCount >= 1) {
          return NextResponse.json(
            { error: 'Professor já tem 1 turma ativa' },
            { status: 400 }
          );
        }
      }
    }

    // Validate link_whatsapp uniqueness if provided
    if (data.link_whatsapp !== undefined && data.link_whatsapp !== null && data.link_whatsapp !== '') {
      const existingLink = await prisma.class.findFirst({
        where: {
          link_whatsapp: data.link_whatsapp,
          id: { not: params.id }, // Exclude current class
        },
        select: { id: true, grupo_repense: true, horario: true },
      });

      if (existingLink) {
        return NextResponse.json(
          { error: 'Link WhatsApp já usado em outra turma' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      atualizado_em: new Date(),
    };

    if (data.capacidade !== undefined) {
      updateData.capacidade = data.capacidade;
    }

    if (data.eh_ativo !== undefined) {
      updateData.eh_ativo = data.eh_ativo;
    }

    if (data.teacher_id !== undefined) {
      updateData.teacher_id = data.teacher_id || null;
    }

    if (data.link_whatsapp !== undefined) {
      updateData.link_whatsapp = data.link_whatsapp || null;
    }

    if (data.horario !== undefined) {
      updateData.horario = data.horario || null;
    }

    if (data.data_inicio !== undefined) {
      updateData.data_inicio = data.data_inicio ? new Date(data.data_inicio) : null;
    }

    if (data.numero_sessoes !== undefined) {
      updateData.numero_sessoes = data.numero_sessoes;
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id: params.id },
      data: updateData,
      include: {
        Teacher: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    // Após mudar professor ou status da turma, sincroniza status dos líderes
    await syncTeachersActiveStatus();

    return NextResponse.json({ class: updatedClass });

  } catch (error) {
    console.error('Error updating class:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/admin/classes/[id]
// ============================================================================

/**
 * Soft delete a class (set arquivada = true)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    // Check if class exists
    const currentClass = await prisma.class.findUnique({
      where: { id: params.id },
      select: { id: true, arquivada: true },
    });

    if (!currentClass) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    // Soft delete by setting arquivada = true
    const updatedClass = await prisma.class.update({
      where: { id: params.id },
      data: {
        arquivada: true,
        eh_ativo: false,
        atualizado_em: new Date(),
      },
    });

    // Após arquivar (delete lógico) turma, sincroniza status dos líderes
    await syncTeachersActiveStatus();

    return NextResponse.json({
      success: true,
      message: 'Turma arquivada com sucesso',
      class: updatedClass,
    });

  } catch (error) {
    console.error('Error deleting class:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
