import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateSessionSchema = z.object({
  relatorio: z.preprocess(
    (val) => {
      // Handle null, undefined, or empty string - all become null
      if (val === null || val === undefined) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return null;
    },
    z.string().nullable().optional()
  ),
});

// ============================================================================
// GET /api/teacher/sessions/[id]
// ============================================================================

/**
 * Get session details
 * 
 * Teacher must own the session's class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const sessionId = params.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        Class: {
          select: {
            id: true,
            teacher_id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
            eh_itu: true,
            numero_sessoes: true,
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

    // Verify teacher owns this class
    if (session.Class.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar esta sessão' },
        { status: 403 }
      );
    }

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
          cidade: session.Class.eh_itu ? 'Itu' : 'Indaiatuba',
          numero_sessoes: session.Class.numero_sessoes,
        },
        attendance: session.Attendance.map((a) => ({
          studentId: a.student_id,
          studentName: a.students.nome,
          presente: a.presente,
          observacao: a.observacao,
        })),
        stats: {
          total: session.Attendance.length,
          presentes: session.Attendance.filter((a) => a.presente).length,
          ausentes: session.Attendance.filter((a) => !a.presente).length,
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

// ============================================================================
// PUT /api/teacher/sessions/[id]
// ============================================================================

/**
 * Update session (complete it with optional relatorio)
 * 
 * Business Rules:
 * - Teacher must own the session's class
 * - Check-in (attendance) is REQUIRED before session completion
 * - relatorio is OPTIONAL
 * 
 * Request Body:
 * { relatorio?: string }
 * 
 * Response:
 * - 200: Session updated
 * - 400: Validation error (check-in not completed)
 * - 401: Unauthorized
 * - 403: Teacher doesn't own this session
 * - 404: Session not found
 * - 500: Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const sessionId = params.id;

    // Parse and validate request body
    const body = await request.json();
    // #region agent log
    console.log('[DEBUG] PUT /api/teacher/sessions/[id] - Request body:', JSON.stringify({ body, bodyType: typeof body.relatorio, bodyValue: body.relatorio }));
    // #endregion
    const parsed = updateSessionSchema.parse(body);
    const { relatorio } = parsed;
    // #region agent log
    console.log('[DEBUG] PUT /api/teacher/sessions/[id] - Parsed relatorio:', JSON.stringify({ relatorio, relatorioType: typeof relatorio, isNull: relatorio === null, isUndefined: relatorio === undefined }));
    // #endregion

    // Find session and verify ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        Class: {
          select: {
            teacher_id: true,
            enrollments: {
              where: { status: 'ativo' },
              select: { student_id: true },
            },
          },
        },
        Attendance: {
          select: { student_id: true },
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
        { error: 'Você não tem permissão para atualizar esta sessão' },
        { status: 403 }
      );
    }

    // Validate check-in is completed (attendance records exist for all enrolled students)
    const enrolledStudentIds = new Set(
      session.Class.enrollments.map((e) => e.student_id)
    );
    const attendanceStudentIds = new Set(
      session.Attendance.map((a) => a.student_id)
    );

    // Check if all enrolled students have attendance records
    const missingAttendance = Array.from(enrolledStudentIds).filter(
      (id) => !attendanceStudentIds.has(id)
    );

    if (missingAttendance.length > 0) {
      return NextResponse.json(
        {
          error: 'Você precisa registrar a presença de todos os alunos antes de finalizar a sessão',
          code: 'CHECK_IN_REQUIRED',
        },
        { status: 400 }
      );
    }

    // Update session with optional relatorio (marks it as complete)
    // IMPORTANT: Use empty string "" to mark session as completed when no report is provided
    // This allows us to distinguish between:
    // - relatorio = null (session is active/in progress)
    // - relatorio = "" (session is completed with no report)
    // - relatorio = "content" (session is completed with report)
    const relatorioValue = relatorio === undefined || relatorio === null ? "" : relatorio;
    // #region agent log
    console.log('[DEBUG] PUT /api/teacher/sessions/[id] - Updating session with relatorio:', JSON.stringify({ relatorioValue, relatorioValueType: typeof relatorioValue, originalValue: relatorio }));
    // #endregion
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: { 
        relatorio: relatorioValue,
      },
      include: {
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
          },
        },
        Attendance: true,
      },
    });

    return NextResponse.json({
      session: {
        id: updatedSession.id,
        numero_sessao: updatedSession.numero_sessao,
        data_sessao: updatedSession.data_sessao,
        relatorio: updatedSession.relatorio,
        class: {
          id: updatedSession.Class.id,
          grupo_repense: updatedSession.Class.grupo_repense,
          horario: updatedSession.Class.horario,
        },
        stats: {
          total: updatedSession.Attendance.length,
          presentes: updatedSession.Attendance.filter((a) => a.presente).length,
        },
      },
      message: 'Sessão finalizada com sucesso',
    });
  } catch (error) {
    console.error('Error updating session:', error);

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
