import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent, getChangedFields } from '@/lib/audit';

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
  cidade: z.enum(['Indaiatuba', 'Itu']).optional(),
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
    await verifyAdminOrTeacherAdminToken(request);

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
        { error: 'Grupo não encontrado' },
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
    const tokenPayload = await verifyAdminOrTeacherAdminToken(request);

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
        { error: 'Grupo não encontrado' },
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
          { error: 'Facilitador não encontrado' },
          { status: 400 }
        );
      }

      // Check if teacher is active
      if (!teacher.eh_ativo) {
        return NextResponse.json(
          { error: 'Facilitador está inativo' },
          { status: 400 }
        );
      }

      // Regra: Facilitador pode ter no máximo 1 grupo ativo (eh_ativo = true, arquivada = false).
      // Só validamos essa regra se o grupo estiver (ou for ficar) ativo.
      if (nextEhAtivo) {
        const activeClassCount = await prisma.class.count({
          where: {
            teacher_id: data.teacher_id,
            eh_ativo: true,
            arquivada: false,
            id: { not: params.id }, // Exclui o próprio grupo atual
          },
        });

        if (activeClassCount >= 1) {
          return NextResponse.json(
            { error: 'Facilitador já tem 1 grupo ativo' },
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
          { error: 'Link WhatsApp já usado em outro grupo' },
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

    if (data.cidade !== undefined) {
      updateData.cidade = data.cidade;
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

    // Log audit event
    await logAuditEvent(
      {
        event_type: 'data_class_update',
        actor_id: tokenPayload.adminId,
        actor_type: 'admin',
        target_entity: 'Class',
        target_id: params.id,
        action: 'update',
        metadata: {
          changed_fields: getChangedFields(currentClass, updatedClass),
          old_values: {
            capacidade: currentClass.capacidade,
            eh_ativo: currentClass.eh_ativo,
            teacher_id: currentClass.teacher_id,
          },
          new_values: {
            capacidade: updatedClass.capacidade,
            eh_ativo: updatedClass.eh_ativo,
            teacher_id: updatedClass.teacher_id,
          },
        },
      },
      request
    );

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
    const tokenPayload = await verifyAdminOrTeacherAdminToken(request);

    // Check if class exists
    const currentClass = await prisma.class.findUnique({
      where: { id: params.id },
      select: { id: true, arquivada: true, grupo_repense: true },
    });

    if (!currentClass) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
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

    // Log audit event
    await logAuditEvent(
      {
        event_type: 'data_class_delete',
        actor_id: tokenPayload.adminId,
        actor_type: 'admin',
        target_entity: 'Class',
        target_id: params.id,
        action: 'delete',
        metadata: {
          method: 'archive',
          grupo_repense: currentClass.grupo_repense,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Grupo arquivado com sucesso',
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
