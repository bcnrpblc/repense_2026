import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrTeacherAdminToken, requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FUNCAO_OPCOES } from '@/lib/constants';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateTeacherSchema = z.object({
  funcao: z.enum(FUNCAO_OPCOES).nullable().optional(),
  eh_admin: z.boolean().optional(),
  toggle_eh_ativo: z.boolean().optional(), // Legacy: toggle active status
});

// ============================================================================
// GET /api/admin/teachers/[id]
// ============================================================================

/**
 * Get a single teacher by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminOrTeacherAdminToken(request);

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        funcao: true,
        eh_admin: true,
        eh_ativo: true,
        criado_em: true,
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
            eh_ativo: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Facilitador não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ teacher });

  } catch (error) {
    console.error('Error fetching teacher:', error);

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
// PATCH /api/admin/teachers/[id]
// ============================================================================

/**
 * Update teacher
 * 
 * Supports:
 * - toggle_eh_ativo: true -> toggles active status (legacy behavior)
 * - funcao: string | null -> update funcao
 * - eh_admin: boolean -> update admin access (superadmin only)
 * 
 * If no body provided, defaults to toggling eh_ativo (backward compatibility)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminPayload = await verifyAdminOrTeacherAdminToken(request);

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        eh_ativo: true,
        eh_admin: true,
        funcao: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Facilitador não encontrado' },
        { status: 404 }
      );
    }

    // Parse request body (may be empty for legacy toggle behavior)
    let body: z.infer<typeof updateTeacherSchema> = {};
    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = updateTeacherSchema.parse(JSON.parse(rawBody));
      } else {
        // No body = legacy toggle behavior
        body = { toggle_eh_ativo: true };
      }
    } catch (parseError) {
      // If parse fails but there was content, it might be legacy empty body
      body = { toggle_eh_ativo: true };
    }

    // Build update data
    const updateData: { eh_ativo?: boolean; funcao?: string | null; eh_admin?: boolean } = {};
    let message = 'Facilitador atualizado com sucesso';

    // Handle eh_admin update (superadmin only)
    if (body.eh_admin !== undefined) {
      // Check if user is superadmin
      const admin = await prisma.admin.findUnique({
        where: { id: adminPayload.adminId },
        select: { role: true },
      });

      if (!admin || admin.role !== 'superadmin') {
        return NextResponse.json(
          { error: 'Apenas superadmin pode alterar acesso admin' },
          { status: 403 }
        );
      }

      updateData.eh_admin = body.eh_admin;
      message = body.eh_admin 
        ? 'Acesso admin concedido com sucesso' 
        : 'Acesso admin removido com sucesso';
    }

    // Handle funcao update
    if (body.funcao !== undefined) {
      updateData.funcao = body.funcao;
      message = 'Função atualizada com sucesso';
    }

    // Handle toggle_eh_ativo (legacy behavior)
    if (body.toggle_eh_ativo) {
      updateData.eh_ativo = !teacher.eh_ativo;
      message = !teacher.eh_ativo
        ? 'Facilitador ativado com sucesso'
        : 'Facilitador desativado com sucesso';
    }

    // Perform update
    const updatedTeacher = await prisma.teacher.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        funcao: true,
        eh_admin: true,
        eh_ativo: true,
        criado_em: true,
      },
    });

    return NextResponse.json({
      teacher: updatedTeacher,
      message,
    });

  } catch (error) {
    console.error('Error updating teacher:', error);

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
