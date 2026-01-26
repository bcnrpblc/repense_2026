import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { createNotificationsForAllAdmins } from '@/lib/notifications';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const reportSchema = z.object({
  classId: z.string().min(1, 'ID do grupo é obrigatório'),
  reportText: z.string().min(20, 'Relatório deve ter pelo menos 20 caracteres').max(500, 'Relatório deve ter no máximo 500 caracteres'),
});

// ============================================================================
// POST /api/teacher/students/[id]/report
// ============================================================================

/**
 * Create a student report via Attendance.observacao
 * 
 * Creates or updates an attendance record for the most recent session
 * of the specified class, setting the observacao field with the report text.
 * 
 * Triggers notification to all admins using existing notification system.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const studentId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const { classId, reportText } = reportSchema.parse(body);

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
        { error: 'Você não tem permissão para criar relatório neste grupo' },
        { status: 403 }
      );
    }

    // Verify student is enrolled in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        class_id: classId,
        status: 'ativo',
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Participante não está matriculado neste grupo' },
        { status: 404 }
      );
    }

    // Find most recent session for this class
    const latestSession = await prisma.session.findFirst({
      where: { class_id: classId },
      orderBy: { data_sessao: 'desc' },
      select: { id: true },
    });

    if (!latestSession) {
      return NextResponse.json(
        { error: 'Nenhuma sessão encontrada para este grupo' },
        { status: 404 }
      );
    }

    // Get existing attendance record if it exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        session_id_student_id: {
          session_id: latestSession.id,
          student_id: studentId,
        },
      },
      select: {
        id: true,
        observacao: true,
      },
    });

    // Create or update attendance record with report
    const attendance = await prisma.attendance.upsert({
      where: {
        session_id_student_id: {
          session_id: latestSession.id,
          student_id: studentId,
        },
      },
      update: {
        observacao: reportText.trim(),
        lida_por_admin: false, // Reset read status
        lida_em: null,
      },
      create: {
        id: randomUUID(),
        session_id: latestSession.id,
        student_id: studentId,
        presente: false, // Context: report about absences
        observacao: reportText.trim(),
        lida_por_admin: false,
      },
    });

    // Trigger notification for all admins (reuse existing system)
    // Only create notification if this is a new observation or was previously empty
    const isNewObservation = !existingAttendance || !existingAttendance.observacao || existingAttendance.observacao.trim().length === 0;
    
    if (isNewObservation) {
      await createNotificationsForAllAdmins('student_observation', attendance.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Relatório enviado aos administradores',
      attendanceId: attendance.id,
    });
  } catch (error) {
    console.error('Error creating student report:', error);

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
