import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotificationsForAllAdmins } from '@/lib/notifications';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const finalReportSchema = z.object({
  final_report: z.string().min(1, 'Relatório final é obrigatório'),
});

// ============================================================================
// PUT /api/teacher/classes/[id]/final-report
// ============================================================================

/**
 * Submit or update final class report
 * 
 * Business Rules:
 * - Teacher must own the class
 * - Final report can be submitted when class has completed required sessions
 * 
 * Request Body:
 * { final_report: string }
 * 
 * Response:
 * - 200: Final report saved
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Teacher doesn't own this class
 * - 404: Class not found
 * - 500: Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const classId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const { final_report } = finalReportSchema.parse(body);

    // Find class and verify ownership (teacher or co-leader)
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        teacher_id: true,
        CoLeaders: {
          where: { id: teacherId },
          select: { id: true },
        },
        grupo_repense: true,
        horario: true,
        numero_sessoes: true,
        Session: {
          select: { id: true },
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
        { error: 'Você não tem permissão para submeter relatório final nesse grupo' },
        { status: 403 }
      );
    }

    // Check if this is a new report (class didn't have final_report before)
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { final_report: true },
    });
    
    const isNewReport = !existingClass?.final_report;

    // Update class with final report
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        final_report: final_report.trim(),
        final_report_em: new Date(),
      },
      select: {
        id: true,
        final_report: true,
        final_report_em: true,
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/teacher/classes/[id]/final-report/route.ts:103',message:'Before creating notification for final report',data:{isNewReport,classId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // Create notification if this is a new final report
    if (isNewReport) {
      await createNotificationsForAllAdmins('final_report', classId);
    }
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/teacher/classes/[id]/final-report/route.ts:107',message:'After creating notification for final report',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      message: 'Relatório final salvo com sucesso',
      class: updatedClass,
    });
  } catch (error) {
    console.error('Error saving final report:', error);

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
// GET /api/teacher/classes/[id]/final-report
// ============================================================================

/**
 * Get final class report (if exists)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const classId = params.id;

    // Find class and verify ownership
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        teacher_id: true,
        CoLeaders: {
          where: { id: teacherId },
          select: { id: true },
        },
        final_report: true,
        final_report_em: true,
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
        { error: 'Você não tem permissão para visualizar relatório final deste grupo' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      final_report: classData.final_report,
      final_report_em: classData.final_report_em,
    });
  } catch (error) {
    console.error('Error fetching final report:', error);

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
