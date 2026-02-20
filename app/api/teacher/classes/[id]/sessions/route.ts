import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/classes/[id]/sessions
// ============================================================================

/**
 * Get all sessions for a class (teacher view)
 * 
 * Returns sessions with attendance summaries
 * Teacher must own the class
 * 
 * Response:
 * - 200: { sessions[] }
 * - 401: Unauthorized
 * - 403: Teacher doesn't own this class
 * - 404: Class not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const classId = params.id;

    // Get class with sessions and attendance; check teacher or co-leader access
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        teacher_id: true,
        CoLeaders: {
          where: { id: teacherId },
          select: { id: true },
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
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    const isTeacher = classData.teacher_id === teacherId;
    const isCoLeader = classData.CoLeaders?.length > 0;
    if (!isTeacher && !isCoLeader) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar sessões deste grupo' },
        { status: 403 }
      );
    }

    // Format sessions with attendance summary
    const sessions = classData.Session.map((session) => {
      const presentes = session.Attendance.filter((a) => a.presente).length;
      const total = session.Attendance.length;

      return {
        id: session.id,
        numero_sessao: session.numero_sessao,
        data_sessao: session.data_sessao.toISOString(),
        relatorio: session.relatorio,
        attendance: {
          presentes,
          total,
          percentual: total > 0 ? Math.round((presentes / total) * 100) : 0,
        },
      };
    });

    return NextResponse.json({
      sessions,
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
