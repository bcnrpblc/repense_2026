import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanCPF, validateCPF } from '@/lib/utils/cpf';
import { cleanPhone } from '@/lib/utils/phone';

// TypeScript types for request body
type StudentData = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  genero?: string;
  estado_civil?: string;
  nascimento?: string;
};

type RegisterRequest = {
  student: StudentData;
  course_id: string;
};

type RegisterResponse = {
  success: true;
  enrollment_id: string;
  student_id: string;
};

type ErrorResponse = {
  error: string;
  validation_errors?: Record<string, string>;
};

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { student, course_id } = body;

    // Validate request structure
    if (!student || !course_id) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing required fields: student and course_id are required' },
        { status: 400 }
      );
    }

    // Validate student fields
    const validationErrors: Record<string, string> = {};
    
    if (!student.nome || student.nome.trim().length === 0) {
      validationErrors.nome = 'Nome é obrigatório';
    }

    if (!student.cpf || student.cpf.trim().length === 0) {
      validationErrors.cpf = 'CPF é obrigatório';
    } else {
      const cleanedCPF = cleanCPF(student.cpf);
      if (!validateCPF(cleanedCPF)) {
        validationErrors.cpf = 'CPF inválido';
      }
    }

    if (!student.telefone || student.telefone.trim().length === 0) {
      validationErrors.telefone = 'Telefone é obrigatório';
    }

    // Email is optional but if provided must be valid
    if (student.email && student.email.trim().length > 0) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(student.email)) {
        validationErrors.email = 'Email inválido';
      }
    }

    // If there are validation errors, return 400
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Dados inválidos',
          validation_errors: validationErrors
        },
        { status: 400 }
      );
    }

    // Clean CPF and phone
    const cleanedCPF = cleanCPF(student.cpf);
    const cleanedPhone = cleanPhone(student.telefone);

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

    // Check for existing CPF
    const existingCPF = await prisma.student.findUnique({
      where: { cpf: cleanedCPF },
    });

    if (existingCPF) {
      return NextResponse.json<ErrorResponse>(
        { error: 'CPF já cadastrado' },
        { status: 409 }
      );
    }

    // Check for existing phone
    const existingPhone = await prisma.student.findUnique({
      where: { telefone: cleanedPhone },
    });

    if (existingPhone) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Telefone já cadastrado' },
        { status: 409 }
      );
    }

    // Check for existing email (only if email is provided)
    if (student.email && student.email.trim().length > 0) {
      const existingEmail = await prisma.student.findUnique({
        where: { email: student.email.trim() },
      });

      if (existingEmail) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Email já cadastrado' },
          { status: 409 }
        );
      }
    }

    // Use Prisma transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if student exists (might be on priority list)
      const existingStudent = await tx.student.findUnique({
        where: { cpf: cleanedCPF },
      });

      let newStudent;
      if (existingStudent) {
        // Update existing student (clear priority list flags)
        newStudent = await tx.student.update({
          where: { id: existingStudent.id },
          data: {
            nome: student.nome.trim(),
            telefone: cleanedPhone,
            email: student.email && student.email.trim().length > 0 ? student.email.trim() : existingStudent.email,
            genero: student.genero?.trim() || existingStudent.genero,
            estado_civil: student.estado_civil?.trim() || existingStudent.estado_civil,
            nascimento: student.nascimento ? new Date(student.nascimento) : existingStudent.nascimento,
            priority_list: false,
            priority_list_course_id: null,
            priority_list_added_at: null,
          },
        });
      } else {
        // Create Student record
        newStudent = await tx.student.create({
          data: {
            nome: student.nome.trim(),
            cpf: cleanedCPF,
            telefone: cleanedPhone,
            email: student.email && student.email.trim().length > 0 ? student.email.trim() : null,
            genero: student.genero?.trim() || null,
            estado_civil: student.estado_civil?.trim() || null,
            nascimento: student.nascimento ? new Date(student.nascimento) : null,
          },
        });
      }

      // Create Enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          student_id: newStudent.id,
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
        student_id: newStudent.id,
        enrollment_id: enrollment.id,
      };
    });

    // Return success response
    return NextResponse.json<RegisterResponse>(
      {
        success: true,
        enrollment_id: result.enrollment_id,
        student_id: result.student_id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering student:', error);

    // Handle Prisma unique constraint violations (fallback)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      let errorMessage = 'Dados já cadastrados';
      
      if (field === 'cpf') {
        errorMessage = 'CPF já cadastrado';
      } else if (field === 'telefone') {
        errorMessage = 'Telefone já cadastrado';
      } else if (field === 'email') {
        errorMessage = 'Email já cadastrado';
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
