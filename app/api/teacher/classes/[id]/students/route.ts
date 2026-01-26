import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/classes/[id]/students
// ============================================================================

/**
 * Get enrolled students for a class with attendance summary
 * 
 * Returns students enrolled in the class with:
 * - Student info (id, nome, email, telefone)
 * - Attendance summary (faltas count, total sessions)
 * 
 * Only returns students with status = 'ativo'
 * Sorted alphabetically by name
 * 
 * Requires: Teacher must own the class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const classId = params.id;

    // Verify teacher owns this class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        teacher_id: true,
        id: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    if (classData.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar este grupo' },
        { status: 403 }
      );
    }

    // Get all sessions for this class
    const sessionIds = await prisma.session.findMany({
      where: { class_id: classId },
      select: { id: true },
    });
    const sessionIdArray = sessionIds.map((s) => s.id);

    // Get enrolled students with attendance data
    const enrollments = await prisma.enrollment.findMany({
      where: {
        class_id: classId,
        status: 'ativo',
      },
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
      orderBy: {
        student: {
          nome: 'asc',
        },
      },
    });

    // Get attendance records for all students in this class
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        session_id: { in: sessionIdArray },
        student_id: { in: enrollments.map((e) => e.student.id) },
      },
      select: {
        student_id: true,
        presente: true,
      },
    });

    // Group attendance by student
    const attendanceByStudent = new Map<string, { faltas: number; total: number }>();
    attendanceRecords.forEach((record) => {
      const existing = attendanceByStudent.get(record.student_id) || { faltas: 0, total: 0 };
      existing.total++;
      if (!record.presente) {
        existing.faltas++;
      }
      attendanceByStudent.set(record.student_id, existing);
    });

    // Format response
    const students = enrollments.map((enrollment) => {
      const attendance = attendanceByStudent.get(enrollment.student.id) || { faltas: 0, total: 0 };
      return {
        id: enrollment.student.id,
        nome: enrollment.student.nome,
        email: enrollment.student.email,
        telefone: enrollment.student.telefone,
        faltas: attendance.faltas,
        totalSessoes: attendance.total,
      };
    });

    return NextResponse.json({
      students,
      total: students.length,
    });
  } catch (error) {
    console.error('Error fetching class students:', error);

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
