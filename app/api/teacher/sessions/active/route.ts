import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/sessions/active
// ============================================================================

/**
 * Get teacher's active session (if exists)
 * 
 * An active session is one where relatorio IS NULL
 * Once finalized (with or without report), relatorio is set to "" or content, marking it as completed
 * 
 * Response:
 * - 200: { session: SessionData | null }
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify teacher authentication
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    // Find active session (relatorio = null) in classes teacher leads or co-leads
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { co_lider_class_id: true },
    });
    const coLiderClassId = teacher?.co_lider_class_id ?? null;

    const activeSession = await prisma.session.findFirst({
      where: {
        Class: {
          OR: [
            { teacher_id: teacherId },
            ...(coLiderClassId ? [{ id: coLiderClassId }] : []),
          ],
        },
        relatorio: null,
      },
      include: {
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
            cidade: true,
            numero_sessoes: true,
            capacidade: true,
            numero_inscritos: true,
            enrollments: {
              where: { status: 'ativo' },
              include: {
                student: {
                  select: {
                    id: true,
                    nome: true,
                    email: true,
                    telefone: true,
                  },
                },
              },
            },
          },
        },
        Attendance: {
          select: {
            id: true,
            student_id: true,
            presente: true,
            observacao: true,
          },
        },
      },
    });

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    // Prepare students with their attendance status
    const students = activeSession.Class.enrollments.map((enrollment) => {
      const attendance = activeSession.Attendance.find(
        (a) => a.student_id === enrollment.student.id
      );

      return {
        studentId: enrollment.student.id,
        nome: enrollment.student.nome,
        email: enrollment.student.email,
        telefone: enrollment.student.telefone,
        attendance: attendance
          ? {
              presente: attendance.presente,
              observacao: attendance.observacao,
            }
          : null,
      };
    });

    return NextResponse.json({
      session: {
        id: activeSession.id,
        numero_sessao: activeSession.numero_sessao,
        data_sessao: activeSession.data_sessao,
        relatorio: activeSession.relatorio,
        class: {
          id: activeSession.Class.id,
          grupo_repense: activeSession.Class.grupo_repense,
          modelo: activeSession.Class.modelo,
          horario: activeSession.Class.horario,
          cidade: activeSession.Class.cidade || 'Indaiatuba',
          numero_sessoes: activeSession.Class.numero_sessoes,
          capacidade: activeSession.Class.capacidade,
          numero_inscritos: activeSession.Class.numero_inscritos,
        },
        students,
        attendanceCount: activeSession.Attendance.filter((a) => a.presente).length,
        totalStudents: students.length,
      },
    });
  } catch (error) {
    console.error('Error fetching active session:', error);

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
