import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AT_RISK_ABSENCE_THRESHOLD } from '@/lib/constants';

// ============================================================================
// GET /api/teacher/at-risk-students
// ============================================================================

/**
 * Get students with >= AT_RISK_ABSENCE_THRESHOLD absences across teacher's classes
 * 
 * Returns students enrolled in teacher's active classes who have
 * 3 or more absences (faltas >= 3)
 * 
 * Sorted by absence count (descending)
 */
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    // Get all active classes this teacher leads or co-leads
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { co_lider_class_id: true },
    });
    const coLiderClassId = teacher?.co_lider_class_id ?? null;

    const classes = await prisma.class.findMany({
      where: {
        eh_ativo: true,
        OR: [
          { teacher_id: teacherId },
          ...(coLiderClassId ? [{ id: coLiderClassId }] : []),
        ],
      },
      select: {
        id: true,
        grupo_repense: true,
      },
    });

    if (classes.length === 0) {
      return NextResponse.json({
        students: [],
        total: 0,
      });
    }

    const classIds = classes.map((c) => c.id);
    const classMap = new Map(classes.map((c) => [c.id, c.grupo_repense]));

    // Get all sessions for these classes
    const sessions = await prisma.session.findMany({
      where: {
        class_id: { in: classIds },
      },
      select: {
        id: true,
        class_id: true,
      },
    });

    const sessionIds = sessions.map((s) => s.id);
    const sessionClassMap = new Map(sessions.map((s) => [s.id, s.class_id]));

    if (sessionIds.length === 0) {
      return NextResponse.json({
        students: [],
        total: 0,
      });
    }

    // Get all enrollments for these classes (active only)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        class_id: { in: classIds },
        status: 'ativo',
      },
      include: {
        student: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      return NextResponse.json({
        students: [],
        total: 0,
      });
    }

    const studentIds = enrollments.map((e) => e.student.id);

    // Get all attendance records for these students in these sessions
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        session_id: { in: sessionIds },
        student_id: { in: studentIds },
        presente: false, // Only absences
      },
      select: {
        student_id: true,
        session_id: true,
      },
    });

    // Count absences per student per class
    const absenceCounts = new Map<string, { studentId: string; classId: string; faltas: number; student: any; grupoRepense: string }>();

    attendanceRecords.forEach((record) => {
      const classId = sessionClassMap.get(record.session_id);
      if (!classId) return;

      const key = `${record.student_id}-${classId}`;
      const existing = absenceCounts.get(key) || {
        studentId: record.student_id,
        classId,
        faltas: 0,
        student: enrollments.find((e) => e.student.id === record.student_id)?.student,
        grupoRepense: classMap.get(classId) || '',
      };
      existing.faltas++;
      absenceCounts.set(key, existing);
    });

    // Filter to only students with >= threshold absences
    const atRiskStudents = Array.from(absenceCounts.values())
      .filter((item) => item.faltas >= AT_RISK_ABSENCE_THRESHOLD)
      .map((item) => ({
        id: item.student.id,
        nome: item.student.nome,
        telefone: item.student.telefone,
        faltas: item.faltas,
        classId: item.classId,
        grupoRepense: item.grupoRepense,
      }))
      .sort((a, b) => b.faltas - a.faltas); // Sort by absences descending

    return NextResponse.json({
      students: atRiskStudents,
      total: atRiskStudents.length,
    });
  } catch (error) {
    console.error('Error fetching at-risk students:', error);

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
