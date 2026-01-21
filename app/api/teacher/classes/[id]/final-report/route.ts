import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Find class and verify ownership
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        teacher_id: true,
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
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    if (classData.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para submeter relatório final nesta turma' },
        { status: 403 }
      );
    }

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
        final_report: true,
        final_report_em: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    if (classData.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar relatório final desta turma' },
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
