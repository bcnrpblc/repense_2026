import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/classes/[id]/sessions
// ============================================================================

/**
 * Get all sessions for a class (admin view)
 * 
 * Returns sessions with attendance summaries
 * 
 * Response:
 * - 200: { class, sessions[] }
 * - 401: Unauthorized
 * - 404: Class not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);
    const classId = params.id;

    // Get class with sessions and attendance
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        Teacher: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        Session: {
          orderBy: { numero_sessao: 'desc' },
          include: {
            Attendance: {
              select: {
                id: true,
                presente: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'ativo' },
            },
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

    // Format sessions with attendance summary
    const sessions = classData.Session.map((session) => {
      const presentes = session.Attendance.filter((a) => a.presente).length;
      const total = session.Attendance.length;

      return {
        id: session.id,
        numero_sessao: session.numero_sessao,
        data_sessao: session.data_sessao,
        relatorio: session.relatorio,
        criado_em: session.criado_em,
        isActive: session.relatorio === null,
        attendance: {
          presentes,
          total,
          percentual: total > 0 ? Math.round((presentes / total) * 100) : 0,
        },
      };
    });

    // Calculate overall stats
    const completedSessions = sessions.filter((s) => !s.isActive);
    const totalAttendance = completedSessions.reduce(
      (sum, s) => sum + s.attendance.presentes,
      0
    );
    const totalPossible = completedSessions.reduce(
      (sum, s) => sum + s.attendance.total,
      0
    );

    return NextResponse.json({
      class: {
        id: classData.id,
        grupo_repense: classData.grupo_repense,
        modelo: classData.modelo,
        horario: classData.horario,
        cidade: classData.cidade || 'Indaiatuba',
        capacidade: classData.capacidade,
        numero_inscritos: classData.numero_inscritos,
        activeEnrollments: classData._count.enrollments,
        numero_sessoes: classData.numero_sessoes,
        eh_ativo: classData.eh_ativo,
        teacher: classData.Teacher,
      },
      sessions,
      stats: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        averageAttendance: totalPossible > 0
          ? Math.round((totalAttendance / totalPossible) * 100)
          : 0,
        hasActiveSession: sessions.some((s) => s.isActive),
      },
    });
  } catch (error) {
    console.error('Error fetching class sessions:', error);

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
