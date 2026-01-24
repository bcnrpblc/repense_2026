import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { createNotificationsForAllAdmins } from '@/lib/notifications';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  presente: z.boolean(),
  observacao: z.string().optional().nullable(),
});

const saveAttendanceSchema = z.object({
  attendanceRecords: z.array(attendanceRecordSchema).min(1),
});

// ============================================================================
// POST /api/teacher/sessions/[id]/attendance
// ============================================================================

/**
 * Save attendance records for a session
 * 
 * Business Rules:
 * - Teacher must own the session's class
 * - All studentIds must be enrolled in this class
 * - Uses upsert for idempotency
 * - Creates records atomically in a transaction
 * 
 * Request Body:
 * { attendanceRecords: [{ studentId, presente, observacao }] }
 * 
 * Response:
 * - 200: Attendance saved
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Teacher doesn't own this session
 * - 404: Session not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const sessionId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const { attendanceRecords } = saveAttendanceSchema.parse(body);

    // Find session and verify ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        Class: {
          select: {
            id: true,
            teacher_id: true,
            enrollments: {
              where: { status: 'ativo' },
              select: { student_id: true },
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

    if (session.Class.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para registrar presenças nesta sessão' },
        { status: 403 }
      );
    }

    // Validate all students are enrolled in this class
    const enrolledStudentIds = new Set(
      session.Class.enrollments.map((e) => e.student_id)
    );

    const invalidStudents = attendanceRecords.filter(
      (r) => !enrolledStudentIds.has(r.studentId)
    );

    if (invalidStudents.length > 0) {
      return NextResponse.json(
        {
          error: 'Alguns participantes não estão matriculados neste grupo',
          invalidStudentIds: invalidStudents.map((s) => s.studentId),
        },
        { status: 400 }
      );
    }

    // Get existing attendance records to check if observations are new
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        session_id: sessionId,
        student_id: { in: attendanceRecords.map((r) => r.studentId) },
      },
      select: {
        id: true,
        student_id: true,
        observacao: true,
      },
    });

    const existingMap = new Map(
      existingAttendances.map((a) => [a.student_id, { id: a.id, observacao: a.observacao }])
    );

    // Use transaction to create/update all attendance records atomically
    const result = await prisma.$transaction(
      attendanceRecords.map((record) =>
        prisma.attendance.upsert({
          where: {
            session_id_student_id: {
              session_id: sessionId,
              student_id: record.studentId,
            },
          },
          update: {
            presente: record.presente,
            observacao: record.observacao || null,
          },
          create: {
            id: randomUUID(),
            session_id: sessionId,
            student_id: record.studentId,
            presente: record.presente,
            observacao: record.observacao || null,
          },
        })
      )
    );

    // Create notifications for student observations that are new or updated from empty to having content
    const recordsWithNewObservations = result.filter((a) => {
      const hasObservation = a.observacao && a.observacao.trim().length > 0;
      if (!hasObservation) return false;

      const existing = existingMap.get(a.student_id);
      // Create notification if:
      // 1. This is a new attendance record (no existing record), OR
      // 2. Existing record had no observation (was null or empty)
      const isNewObservation = !existing || !existing.observacao || existing.observacao.trim().length === 0;

      return isNewObservation;
    });

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/teacher/sessions/[id]/attendance/route.ts:165',message:'Before creating notifications for observations',data:{recordsWithNewObservationsCount:recordsWithNewObservations.length,attendanceIds:recordsWithNewObservations.map(a=>a.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Create notifications (skip duplicates will handle if notification already exists)
    for (const attendance of recordsWithNewObservations) {
      await createNotificationsForAllAdmins('student_observation', attendance.id);
    }
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/teacher/sessions/[id]/attendance/route.ts:170',message:'After creating notifications for observations',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Calculate stats
    const presentes = result.filter((a) => a.presente).length;
    const ausentes = result.filter((a) => !a.presente).length;

    return NextResponse.json({
      message: 'Presenças salvas com sucesso',
      stats: {
        total: result.length,
        presentes,
        ausentes,
        percentual: Math.round((presentes / result.length) * 100),
      },
    });
  } catch (error) {
    console.error('Error saving attendance:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

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

// ============================================================================
// GET /api/teacher/sessions/[id]/attendance
// ============================================================================

/**
 * Get attendance records for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const sessionId = params.id;

    // Find session and verify ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        Class: {
          select: {
            teacher_id: true,
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
        Attendance: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    if (session.Class.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar esta sessão' },
        { status: 403 }
      );
    }

    // Map attendance records with student info
    const attendanceMap = new Map(
      session.Attendance.map((a) => [a.student_id, a])
    );

    const students = session.Class.enrollments.map((enrollment) => {
      const attendance = attendanceMap.get(enrollment.student.id);
      return {
        studentId: enrollment.student.id,
        nome: enrollment.student.nome,
        email: enrollment.student.email,
        telefone: enrollment.student.telefone,
        presente: attendance?.presente ?? null,
        observacao: attendance?.observacao ?? null,
      };
    });

    const presentes = students.filter((s) => s.presente === true).length;

    return NextResponse.json({
      sessionId,
      students,
      stats: {
        total: students.length,
        presentes,
        ausentes: students.filter((s) => s.presente === false).length,
        naoRegistrado: students.filter((s) => s.presente === null).length,
        percentual: students.length > 0 
          ? Math.round((presentes / students.length) * 100) 
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);

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
