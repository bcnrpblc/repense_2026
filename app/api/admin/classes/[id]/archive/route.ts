import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncTeachersActiveStatus } from '@/lib/teacherStatus';

// ============================================================================
// PUT /api/admin/classes/[id]/archive
// ============================================================================

/**
 * Toggle archive status of a class
 * If archived, unarchive. If not archived, archive.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    // Check if class exists
    const currentClass = await prisma.class.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        arquivada: true,
        grupo_repense: true,
        horario: true,
        numero_sessoes: true,
        Session: {
          select: { id: true },
        },
        final_report: true,
      },
    });

    if (!currentClass) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Toggle archive status
    const newArquivada = !currentClass.arquivada;

    // Validate final report requirement when archiving a completed class
    if (newArquivada) {
      const sessionCount = currentClass.Session.length;
      const requiredSessions = currentClass.numero_sessoes;

      // If class has completed required sessions, final report is mandatory
      if (sessionCount >= requiredSessions && !currentClass.final_report) {
        return NextResponse.json(
          {
            error: 'Relatório final é obrigatório para arquivar um grupo que completou todas as sessões',
            code: 'FINAL_REPORT_REQUIRED',
          },
          { status: 400 }
        );
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id: params.id },
      data: {
        arquivada: newArquivada,
        // If archiving, also deactivate
        eh_ativo: newArquivada ? false : undefined,
        atualizado_em: new Date(),
      },
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

    // Após arquivar/desarquivar grupo, sincroniza status dos facilitadores
    await syncTeachersActiveStatus();

    return NextResponse.json({
      success: true,
      message: newArquivada
        ? 'Grupo arquivado com sucesso'
        : 'Grupo desarquivado com sucesso',
      class: updatedClass,
    });

  } catch (error) {
    console.error('Error toggling archive status:', error);

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
// POST /api/admin/classes/[id]/archive (Batch archive)
// ============================================================================

/**
 * Archive multiple classes at once
 * Body: { classIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const { classIds } = body;

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de grupos inválido' },
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
      message: `${result.count} grupo(s) arquivado(s) com sucesso`,
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
