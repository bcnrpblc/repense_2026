import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// POST /api/admin/classes/batch/archive
// ============================================================================

/**
 * Archive multiple classes at once (batch operation)
 * Body: { classIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const { classIds } = body;

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de turmas inválida' },
        { status: 400 }
      );
    }

    // Archive all specified classes
    const result = await prisma.class.updateMany({
      where: {
        id: { in: classIds },
      },
      data: {
        arquivada: true,
        eh_ativo: false,
        atualizado_em: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} turma(s) arquivada(s) com sucesso`,
      count: result.count,
    });

  } catch (error) {
    console.error('Error batch archiving classes:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
