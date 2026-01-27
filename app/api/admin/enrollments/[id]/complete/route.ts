import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { completeEnrollment, EnrollmentError } from '@/lib/enrollment';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

// ============================================================================
// POST /api/admin/enrollments/[id]/complete
// ============================================================================

/**
 * Complete an enrollment (mark as concluido)
 * Admin only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const tokenPayload = await verifyAdminToken(request);

    const enrollmentId = params.id;

    // Verify enrollment exists and get details for response
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          select: {
            id: true,
            nome: true,
          },
        },
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscrição não encontrada' },
        { status: 404 }
      );
    }

    // Complete the enrollment
    await completeEnrollment(enrollmentId);

    // Fetch updated enrollment
    const updatedEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            email: true,
            telefone: true,
          },
        },
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent(
      {
        event_type: 'data_enrollment_update',
        actor_id: tokenPayload.adminId,
        actor_type: 'admin',
        target_entity: 'Enrollment',
        target_id: enrollmentId,
        action: 'complete',
        metadata: {
          student_id: enrollment.student.id,
          student_nome: enrollment.student.nome,
          class_id: enrollment.Class.id,
          grupo_repense: enrollment.Class.grupo_repense,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: `Inscrição de ${enrollment.student.nome} concluída com sucesso`,
      enrollment: updatedEnrollment,
    });

  } catch (error) {
    console.error('Error completing enrollment:', error);

    // Handle specific enrollment errors
    if (error instanceof EnrollmentError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle auth errors
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
