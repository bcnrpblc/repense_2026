import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanPhone } from '@/lib/utils/phone';

// TypeScript types for request body
type StudentUpdates = {
  email?: string;
  telefone?: string;
  genero?: string;
  estado_civil?: string;
};

type ContinueRegisterRequest = {
  student_id: string;
  course_id: string;
  updates?: StudentUpdates;
};

type ContinueRegisterResponse = {
  success: true;
  enrollment_id: string;
};

type ErrorResponse = {
  error: string;
  validation_errors?: Record<string, string>;
};

export async function POST(request: NextRequest) {
  try {
    const body: ContinueRegisterRequest = await request.json();
    const { student_id, course_id, updates } = body;

    // Validate request structure
    if (!student_id || !course_id) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing required fields: student_id and course_id are required' },
        { status: 400 }
      );
    }

    // Validate updates if provided
    const validationErrors: Record<string, string> = {};

    if (updates) {
      if (updates.email !== undefined && updates.email.trim().length > 0) {
        // Email is optional but if provided must be valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updates.email)) {
          validationErrors.email = 'Email inválido';
        }
      }

      if (updates.telefone !== undefined) {
        if (!updates.telefone || updates.telefone.trim().length === 0) {
          validationErrors.telefone = 'Telefone não pode ser vazio';
        }
      }
    }

    // If there are validation errors, return 400
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Dados inválidos',
          validation_errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: student_id },
    });

    if (!student) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Estudante não encontrado' },
        { status: 404 }
      );
    }

    // Check if course exists
    const course = await prisma.class.findUnique({
      where: { id: course_id },
    });

    if (!course) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    // Check if course is active
    if (!course.eh_ativo) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Curso não está ativo' },
        { status: 400 }
      );
    }

    // Check course capacity
    if (course.numero_inscritos >= course.capacidade) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Curso lotado' },
        { status: 409 }
      );
    }

    // Check if already enrolled in this course
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_class_id: {
          student_id: student.id,
          class_id: course.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Você já está inscrito neste curso' },
        { status: 409 }
      );
    }

    // If updates provided, validate uniqueness for email and telefone
    if (updates) {
      if (updates.email && updates.email !== student.email) {
        const existingEmail = await prisma.student.findUnique({
          where: { email: updates.email },
        });

        if (existingEmail) {
          return NextResponse.json<ErrorResponse>(
            { error: 'Email já cadastrado' },
            { status: 409 }
          );
        }
      }

      if (updates.telefone) {
        const cleanedPhone = cleanPhone(updates.telefone);
        if (cleanedPhone !== student.telefone) {
          const existingPhone = await prisma.student.findUnique({
            where: { telefone: cleanedPhone },
          });

          if (existingPhone) {
            return NextResponse.json<ErrorResponse>(
              { error: 'Telefone já cadastrado' },
              { status: 409 }
            );
          }
        }
      }
    }

    // Use Prisma transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update student if updates provided
      if (updates) {
        const updateData: {
          email?: string | null;
          telefone?: string;
          genero?: string | null;
          estado_civil?: string | null;
        } = {};

        if (updates.email !== undefined) {
          updateData.email = updates.email && updates.email.trim().length > 0 ? updates.email.trim() : null;
        }

        if (updates.telefone !== undefined) {
          updateData.telefone = cleanPhone(updates.telefone);
        }

        if (updates.genero !== undefined) {
          updateData.genero = updates.genero.trim() || null;
        }

        if (updates.estado_civil !== undefined) {
          updateData.estado_civil = updates.estado_civil.trim() || null;
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length > 0) {
          await tx.student.update({
            where: { id: student.id },
            data: updateData,
          });
        }
      }

      // Create Enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          student_id: student.id,
          class_id: course.id,
        },
      });

      // Increment course.numero_inscritos
      await tx.class.update({
        where: { id: course.id },
        data: {
          numero_inscritos: {
            increment: 1,
          },
        },
      });

      return {
        enrollment_id: enrollment.id,
      };
    });

    // Return success response
    return NextResponse.json<ContinueRegisterResponse>(
      {
        success: true,
        enrollment_id: result.enrollment_id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error continuing registration:', error);

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const target = error.meta?.target;

      // Check if it's the enrollment unique constraint
      if (Array.isArray(target) && target.includes('student_id') && target.includes('class_id')) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Você já está inscrito neste curso' },
          { status: 409 }
        );
      }

      // Handle other unique constraints
      const field = target?.[0];
      let errorMessage = 'Dados já cadastrados';

      if (field === 'email') {
        errorMessage = 'Email já cadastrado';
      } else if (field === 'telefone') {
        errorMessage = 'Telefone já cadastrado';
      }

      return NextResponse.json<ErrorResponse>(
        { error: errorMessage },
        { status: 409 }
      );
    }

    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Erro ao processar registro' },
        { status: 500 }
      );
    }

    // Handle general errors
    return NextResponse.json<ErrorResponse>(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
