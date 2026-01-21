import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { cancelEnrollment, EnrollmentError } from '@/lib/enrollment';
import { prisma } from '@/lib/prisma';

// ============================================================================
// POST /api/admin/enrollments/[id]/cancel
// ============================================================================

/**
 * Cancel an enrollment
 * Admin only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    await verifyAdminToken(request);

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

    // Cancel the enrollment
    await cancelEnrollment(enrollmentId);

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
            eh_itu: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Inscrição de ${enrollment.student.nome} cancelada com sucesso`,
      enrollment: updatedEnrollment,
    });

  } catch (error) {
    console.error('Error cancelling enrollment:', error);

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
