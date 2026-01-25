import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/sessions/[id]
// ============================================================================

/**
 * Get session details for admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);
    const sessionId = params.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
            cidade: true,
          },
        },
        Attendance: {
          include: {
            students: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Format attendance records
    const attendance = session.Attendance.map((a) => ({
      studentId: a.student_id,
      studentName: a.students.nome,
      presente: a.presente,
      observacao: a.observacao,
    }));

    const presentes = attendance.filter((a) => a.presente).length;
    const ausentes = attendance.filter((a) => !a.presente).length;

    return NextResponse.json({
      session: {
        id: session.id,
        numero_sessao: session.numero_sessao,
        data_sessao: session.data_sessao,
        relatorio: session.relatorio,
        criado_em: session.criado_em,
        class: {
          id: session.Class.id,
          grupo_repense: session.Class.grupo_repense,
          modelo: session.Class.modelo,
          horario: session.Class.horario,
          cidade: session.Class.cidade || 'Indaiatuba',
        },
        attendance,
        stats: {
          total: attendance.length,
          presentes,
          ausentes,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('token') ||
        error.message.includes('authorization') ||
        error.message.includes('expired')
      ) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
