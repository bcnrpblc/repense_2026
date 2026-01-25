import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cleanCPF, validateCPF } from '@/lib/utils/cpf';
import { cleanPhone } from '@/lib/utils/phone';
import { normalizeNameBR } from '@/lib/utils/names';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const priorityListSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().min(1, 'CPF é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().optional(),
  genero: z.string().optional(),
  estado_civil: z.string().optional(),
  nascimento: z.string().optional(),
  course_id: z.string().min(1, 'course_id é obrigatório'),
  cidade_preferencia: z.string().optional(),
});

// ============================================================================
// POST /api/students/priority-list
// ============================================================================

/**
 * Add student to priority list
 * 
 * Business Rules:
 * - Creates or updates student record
 * - Sets priority_list = true
 * - Links to course_id
 * - Does NOT create enrollment
 * - Mutually exclusive with active enrollment
 * 
 * Request Body:
 * { nome, cpf, telefone, email?, genero?, estado_civil?, nascimento?, course_id }
 * 
 * Response:
 * - 201: Student added to priority list
 * - 400: Validation error
 * - 404: Course not found
 * - 409: Student already enrolled
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = priorityListSchema.parse(body);

    // Validate CPF
    const cleanedCPF = cleanCPF(data.cpf);
    if (!validateCPF(cleanedCPF)) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    // Validate phone
    const cleanedPhone = cleanPhone(data.telefone);

    // Check if course exists
    const course = await prisma.class.findUnique({
      where: { id: data.course_id },
      select: { id: true, grupo_repense: true, horario: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    // Check for existing student by CPF
    const existingStudent = await prisma.student.findUnique({
      where: { cpf: cleanedCPF },
      include: {
        enrollments: {
          where: { status: 'ativo' },
          select: { id: true, class_id: true },
        },
      },
    });

    // If student exists and has active enrollment, cannot add to priority list
    if (existingStudent && existingStudent.enrollments.length > 0) {
      return NextResponse.json(
        { error: 'O participante já possui inscrição ativa. Não é possível adicionar à lista de prioridade.' },
        { status: 409 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      let student;
      
      if (existingStudent) {
        // Update existing student to priority list
        student = await tx.student.update({
          where: { id: existingStudent.id },
          data: {
            nome: normalizeNameBR(data.nome.trim()),
            telefone: cleanedPhone,
            email: data.email && data.email.trim().length > 0 ? data.email.trim() : existingStudent.email,
            genero: data.genero?.trim() || existingStudent.genero,
            estado_civil: data.estado_civil?.trim() || existingStudent.estado_civil,
            nascimento: data.nascimento && data.nascimento.trim() 
              ? (isNaN(new Date(data.nascimento).getTime()) ? existingStudent.nascimento : new Date(data.nascimento))
              : existingStudent.nascimento,
            cidade_preferencia: data.cidade_preferencia?.trim() || existingStudent.cidade_preferencia,
            priority_list: true,
            priority_list_course_id: data.course_id,
            priority_list_added_at: new Date(),
          },
        });
      } else {
        // Create new student with priority list flag
        student = await tx.student.create({
          data: {
            nome: normalizeNameBR(data.nome.trim()),
            cpf: cleanedCPF,
            telefone: cleanedPhone,
            email: data.email && data.email.trim().length > 0 ? data.email.trim() : null,
            genero: data.genero?.trim() || null,
            estado_civil: data.estado_civil?.trim() || null,
            nascimento: (() => {
              if (!data.nascimento || !data.nascimento.trim()) {
                return null;
              }
              const dateObj = new Date(data.nascimento);
              return !isNaN(dateObj.getTime()) ? dateObj : null;
            })(),
            cidade_preferencia: data.cidade_preferencia?.trim() || null,
            priority_list: true,
            priority_list_course_id: data.course_id,
            priority_list_added_at: new Date(),
          },
        });
      }

      return {
        student_id: student.id,
        course_id: data.course_id,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Você foi adicionado à lista de prioridade',
      student_id: result.student_id,
      course_id: result.course_id,
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding student to priority list:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violations
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      const field = (error as any).meta?.target?.[0];
      let errorMessage = 'Dados já cadastrados';
      
      if (field === 'cpf') {
        errorMessage = 'CPF já cadastrado';
      } else if (field === 'telefone') {
        errorMessage = 'Telefone já cadastrado';
      } else if (field === 'email') {
        errorMessage = 'Email já cadastrado';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
