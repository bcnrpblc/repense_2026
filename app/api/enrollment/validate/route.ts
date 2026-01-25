import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// POST /api/enrollment/validate
// ============================================================================

/**
 * Validate if a student can enroll in a class
 * Public endpoint for student app integration
 * 
 * Body: { studentId, classId }
 * Returns: { canEnroll: boolean, reason?: string, warning?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, classId } = body;

    // Validate required fields
    if (!studentId || !classId) {
      return NextResponse.json(
        { error: 'studentId e classId são obrigatórios' },
        { status: 400 }
      );
    }

    // Fetch student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        nome: true,
        genero: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { canEnroll: false, reason: 'Participante não encontrado' },
        { status: 200 }
      );
    }

    // Fetch class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        grupo_repense: true,
        eh_ativo: true,
        capacidade: true,
        numero_inscritos: true,
        eh_mulheres: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { canEnroll: false, reason: 'Grupo não encontrado' },
        { status: 200 }
      );
    }

    // Check if class is active
    if (!classData.eh_ativo) {
      return NextResponse.json(
        { canEnroll: false, reason: 'Este grupo não está ativo para novas inscrições' },
        { status: 200 }
      );
    }

    // Check class capacity
    if (classData.numero_inscritos >= classData.capacidade) {
      return NextResponse.json(
        { canEnroll: false, reason: 'Este grupo está lotado' },
        { status: 200 }
      );
    }

    // Check women-only restriction
    if (classData.eh_mulheres && student.genero === 'Masculino') {
      return NextResponse.json(
        { canEnroll: false, reason: 'Este grupo é exclusivo para mulheres' },
        { status: 200 }
      );
    }

    // Check for existing enrollments in same grupo_repense
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        student_id: studentId,
        Class: {
          grupo_repense: classData.grupo_repense,
        },
      },
      include: {
        Class: {
          select: {
            grupo_repense: true,
            horario: true,
          },
        },
      },
      orderBy: {
        criado_em: 'desc',
      },
    });

    // Check for active enrollment in same grupo
    const activeEnrollment = existingEnrollments.find((e) => e.status === 'ativo');
    if (activeEnrollment) {
      return NextResponse.json(
        {
          canEnroll: false,
          reason: `Você já possui uma inscrição ativa no grupo ${classData.grupo_repense}`,
          existingEnrollmentId: activeEnrollment.id,
        },
        { status: 200 }
      );
    }

    // Check for completed enrollment
    const completedEnrollment = existingEnrollments.find((e) => e.status === 'concluido');
    if (completedEnrollment) {
      return NextResponse.json(
        {
          canEnroll: false,
          reason: `Você já concluiu o Repense ${classData.grupo_repense}`,
          completedAt: completedEnrollment.concluido_em,
        },
        { status: 200 }
      );
    }

    // Check for cancelled enrollment (can re-enroll with warning)
    const cancelledEnrollment = existingEnrollments.find((e) => e.status === 'cancelado');
    if (cancelledEnrollment) {
      return NextResponse.json(
        {
          canEnroll: true,
          warning: `Você já se inscreveu neste grupo anteriormente mas cancelou. Deseja se inscrever novamente?`,
          previousCancellation: {
            cancelledAt: cancelledEnrollment.cancelado_em,
            classInfo: cancelledEnrollment.Class.horario,
          },
          requiresConfirmation: true,
        },
        { status: 200 }
      );
    }

    // Check for transferred enrollment (can re-enroll with info)
    const transferredEnrollment = existingEnrollments.find((e) => e.status === 'transferido');
    if (transferredEnrollment) {
      // Check if there's an active enrollment from the transfer
      const activeFromTransfer = existingEnrollments.find(
        (e) => e.status === 'ativo' && e.transferido_de_class_id
      );
      if (activeFromTransfer) {
        return NextResponse.json(
          {
            canEnroll: false,
            reason: `Você já possui uma inscrição ativa no grupo ${classData.grupo_repense} (transferida)`,
            existingEnrollmentId: activeFromTransfer.id,
          },
          { status: 200 }
        );
      }
    }

    // All checks passed
    return NextResponse.json({
      canEnroll: true,
      grupoRepense: classData.grupo_repense,
      vagasDisponiveis: classData.capacidade - classData.numero_inscritos,
    });

  } catch (error) {
    console.error('Error validating enrollment:', error);

    return NextResponse.json(
      { error: 'Erro ao validar inscrição' },
      { status: 500 }
    );
  }
}
