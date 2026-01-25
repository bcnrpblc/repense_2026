import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    await verifyAdminToken(request);

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
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
 * Toggle teacher active status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        eh_ativo: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Facilitador não encontrado' },
        { status: 404 }
      );
    }

    // Toggle eh_ativo status
    const updatedTeacher = await prisma.teacher.update({
      where: { id: params.id },
      data: {
        eh_ativo: !teacher.eh_ativo,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        eh_ativo: true,
        criado_em: true,
      },
    });

    return NextResponse.json({
      teacher: updatedTeacher,
      message: updatedTeacher.eh_ativo
        ? 'Facilitador ativado com sucesso'
        : 'Facilitador desativado com sucesso',
    });

  } catch (error) {
    console.error('Error updating teacher:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
