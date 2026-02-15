import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrollStudent, EnrollmentError, EnrollmentErrorCodes } from '@/lib/enrollment';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const transferPrioritySchema = z.object({
  newCourseId: z.string().min(1, 'course_id é obrigatório'),
});

// ============================================================================
// POST /api/admin/students/[id]/transfer-priority
// ============================================================================

/**
 * Transfer a priority list student to a new course
 * Updates priority_list_course_id to the new course
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminOrTeacherAdminToken(request);

    const body = await request.json();
    const { newCourseId } = transferPrioritySchema.parse(body);

    const studentId = params.id;

    // Verify student exists and is on priority list
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        priority_list: true,
        priority_list_course_id: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Participante não encontrado' },
        { status: 404 }
      );
    }

    if (!student.priority_list) {
      return NextResponse.json(
        { error: 'Participante não está na lista de prioridade' },
        { status: 400 }
      );
    }

    // Verify new course exists and is active
    const newCourse = await prisma.class.findUnique({
      where: { id: newCourseId },
      select: {
        id: true,
        eh_ativo: true,
        capacidade: true,
        numero_inscritos: true,
        grupo_repense: true,
      },
    });

    if (!newCourse) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    if (!newCourse.eh_ativo) {
      return NextResponse.json(
        { error: 'Grupo não está ativo' },
        { status: 400 }
      );
    }

    // Check if class has capacity
    if (newCourse.numero_inscritos >= newCourse.capacidade) {
      return NextResponse.json(
        { error: 'Grupo não possui vagas disponíveis' },
        { status: 400 }
      );
    }

    // Enroll student in the class and clear priority list flags
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Enroll student in the class using enrollment logic
        // Check for existing enrollments first
        const existingEnrollments = await tx.enrollment.findMany({
          where: {
            student_id: studentId,
            Class: {
              grupo_repense: newCourse.grupo_repense,
            },
          },
        });

        // Check for active enrollment in same grupo_repense
        const activeEnrollment = existingEnrollments.find((e) => e.status === 'ativo');
        if (activeEnrollment) {
          throw new Error(`Já possui inscrição ativa em ${newCourse.grupo_repense}`);
        }

        // Lock and check class capacity atomically
        const classLocked = await tx.class.findUnique({
          where: { id: newCourseId },
          select: {
            eh_ativo: true,
            capacidade: true,
            numero_inscritos: true,
            grupo_repense: true,
          },
        });

        if (!classLocked || !classLocked.eh_ativo) {
          throw new Error('Grupo não está ativo');
        }

        if (classLocked.numero_inscritos >= classLocked.capacidade) {
          throw new Error('Grupo não possui vagas disponíveis');
        }

        // Create enrollment
        const enrollment = await tx.enrollment.create({
          data: {
            student_id: studentId,
            class_id: newCourseId,
            status: 'ativo',
          },
        });

        // Increment class enrollment count
        await tx.class.update({
          where: { id: newCourseId },
          data: {
            numero_inscritos: {
              increment: 1,
            },
          },
        });

        // Clear priority list flags
        const updatedStudent = await tx.student.update({
          where: { id: studentId },
          data: {
            priority_list: false,
            priority_list_course_id: null,
            priority_list_added_at: null,
          },
          select: {
            id: true,
            priority_list: true,
          },
        });

        return {
          enrollmentId: enrollment.id,
          student: updatedStudent,
        };
      });

      return NextResponse.json({
          message: 'Participante da lista de prioridade transferido e matriculado com sucesso',
        enrollment_id: result.enrollmentId,
        student: result.student,
      });
    } catch (error) {
      // Handle enrollment errors
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error transferring priority list student:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
