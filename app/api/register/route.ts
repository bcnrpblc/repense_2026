import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanCPF, validateCPF } from '@/lib/utils/cpf';
import { cleanPhone } from '@/lib/utils/phone';
import { normalizeNameBR, hasFullName } from '@/lib/utils/names';
import { logger } from '@/lib/logger';

// TypeScript types for request body
type StudentData = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  genero?: string;
  estado_civil?: string;
  nascimento?: string;
  cidade_preferencia?: string;
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

type CourseChangeResponse = {
  requires_course_change: true;
  existing_enrollment: {
    id: string;
    class_id: string;
    status: string;
    student_id: string;
  };
  current_course: {
    id: string;
    grupo_repense: string;
    modelo: string;
    horario: string | null;
    data_inicio: Date | null;
  };
  new_course: {
    id: string;
    grupo_repense: string;
    modelo: string;
    horario: string | null;
    data_inicio: Date | null;
  };
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';
  const route = '/api/register';
  const method = request.method;
  const start = Date.now();
  logger.info('request start', { requestId, route, method });
  const respond = <T,>(body: T, status: number) => {
    logger.info('request end', {
      requestId,
      route,
      method,
      status,
      duration_ms: Date.now() - start,
    });
    return NextResponse.json<T>(body, { status });
  };

  try {
    const body: RegisterRequest = await request.json();
    const { student, course_id } = body;

    // Validate request structure
    if (!student || !course_id) {
      return respond<ErrorResponse>(
        { error: 'Missing required fields: student and course_id are required' },
        400
      );
    }

    // Validate student fields
    const validationErrors: Record<string, string> = {};
    
    if (!student.nome || student.nome.trim().length === 0) {
      validationErrors.nome = 'Nome completo é obrigatório';
    } else if (!hasFullName(student.nome.trim())) {
      validationErrors.nome = 'Digite nome e sobrenome (nome completo)';
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
      return respond<ErrorResponse>(
        { 
          error: 'Dados inválidos',
          validation_errors: validationErrors
        },
        400
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
      return respond<ErrorResponse>(
        { error: 'Curso não encontrado' },
        404
      );
    }

    // Check if course is active
    if (!course.eh_ativo) {
      return respond<ErrorResponse>(
        { error: 'Curso não está ativo' },
        400
      );
    }

    // Check course capacity
    if (course.numero_inscritos >= course.capacidade) {
      return respond<ErrorResponse>(
        { error: 'Curso lotado' },
        409
      );
    }

    // Check for existing CPF with active enrollments
    const existingStudent = await prisma.student.findUnique({
      where: { cpf: cleanedCPF },
      include: {
        enrollments: {
          where: { status: 'ativo' },
          include: {
            Class: {
              select: {
                id: true,
                grupo_repense: true,
                modelo: true,
                horario: true,
                data_inicio: true,
                capacidade: true,
                numero_inscritos: true,
              },
            },
          },
        },
      },
    });

    // If student exists, check enrollment scenarios
    if (existingStudent) {
      const activeEnrollments = existingStudent.enrollments;
      const selectedCourseGrupo = course.grupo_repense;
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/register/route.ts:168',message:'Existing student active enrollments',data:{studentId:existingStudent.id,activeEnrollmentCount:activeEnrollments.length,selectedGrupo:selectedCourseGrupo},timestamp:Date.now(),sessionId:'debug-session',runId:'run11',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      // First check: Is student already enrolled in the EXACT same class?
      const exactClassEnrollment = activeEnrollments.find(
        (e) => e.class_id === course_id
      );

      if (exactClassEnrollment) {
        return respond<ErrorResponse>(
          { error: 'Você já está matriculado nesta grupo' },
          409
        );
      }

      // Second check: Active enrollment in SAME grupo_repense (different class)
      const sameGrupoEnrollment = activeEnrollments.find(
        (e) => e.Class.grupo_repense === selectedCourseGrupo
      );

      if (sameGrupoEnrollment) {
        // Different class but same grupo_repense - requires course change
        return respond<CourseChangeResponse>(
          {
            requires_course_change: true,
            existing_enrollment: {
              id: sameGrupoEnrollment.id,
              class_id: sameGrupoEnrollment.class_id,
              status: sameGrupoEnrollment.status,
              student_id: existingStudent.id,
            },
            current_course: {
              id: sameGrupoEnrollment.Class.id,
              grupo_repense: sameGrupoEnrollment.Class.grupo_repense,
              modelo: sameGrupoEnrollment.Class.modelo,
              horario: sameGrupoEnrollment.Class.horario,
              data_inicio: sameGrupoEnrollment.Class.data_inicio,
            },
            new_course: {
              id: course.id,
              grupo_repense: course.grupo_repense,
              modelo: course.modelo,
              horario: course.horario,
              data_inicio: course.data_inicio,
            },
          },
          200
        );
      }

      const concludedEnrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: existingStudent.id,
          class_id: course_id,
          status: 'concluido',
        },
        select: {
          id: true,
        },
      });
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/register/route.ts:218',message:'Concluded enrollment check',data:{activeEnrollmentCount:activeEnrollments.length,hasConcluded:!!concludedEnrollment},timestamp:Date.now(),sessionId:'debug-session',runId:'run12',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (concludedEnrollment) {
        return respond<ErrorResponse>(
          { error: 'você já concluiu esse PG Repense' },
          409
        );
      }

      // Scenario C: Active enrollment in DIFFERENT grupo_repense
      // Check if user wants to enroll in multiple grupos simultaneously
      // For now, we'll show a confirmation modal for this case too
      // Return course change response for different grupo too (user should confirm)
      if (activeEnrollments.length > 0) {
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/register/route.ts:231',message:'Scenario C fallback',data:{activeEnrollmentCount:activeEnrollments.length,hasFirstEnrollment:!!activeEnrollments[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run11',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        const existingEnrollment = activeEnrollments[0]; // Use first active enrollment
        return respond<CourseChangeResponse>(
          {
            requires_course_change: true,
            existing_enrollment: {
              id: existingEnrollment.id,
              class_id: existingEnrollment.class_id,
              status: existingEnrollment.status,
              student_id: existingStudent.id,
            },
            current_course: {
              id: existingEnrollment.Class.id,
              grupo_repense: existingEnrollment.Class.grupo_repense,
              modelo: existingEnrollment.Class.modelo,
              horario: existingEnrollment.Class.horario,
              data_inicio: existingEnrollment.Class.data_inicio,
            },
            new_course: {
              id: course.id,
              grupo_repense: course.grupo_repense,
              modelo: course.modelo,
              horario: course.horario,
              data_inicio: course.data_inicio,
            },
          },
          200
        );
      }
    }

    // Check for existing phone (only if different student)
    if (!existingStudent) {
      const existingPhone = await prisma.student.findUnique({
        where: { telefone: cleanedPhone },
      });

      if (existingPhone) {
        return respond<ErrorResponse>(
          { error: 'Telefone já cadastrado' },
          409
        );
      }
    } else if (existingStudent.telefone !== cleanedPhone) {
      // Existing student changing phone - check if new phone is taken by another student
      const existingPhone = await prisma.student.findUnique({
        where: { telefone: cleanedPhone },
      });

      if (existingPhone && existingPhone.id !== existingStudent.id) {
        return respond<ErrorResponse>(
          { error: 'Telefone já cadastrado' },
          409
        );
      }
    }

    // Check for existing email (only if email is provided and different student)
    if (student.email && student.email.trim().length > 0) {
      const trimmedEmail = student.email.trim();
      
      if (!existingStudent) {
        const existingEmail = await prisma.student.findUnique({
          where: { email: trimmedEmail },
        });

        if (existingEmail) {
          return respond<ErrorResponse>(
            { error: 'Email já cadastrado' },
            409
          );
        }
      } else if (existingStudent.email !== trimmedEmail) {
        // Existing student changing email - check if new email is taken by another student
        const existingEmail = await prisma.student.findUnique({
          where: { email: trimmedEmail },
        });

        if (existingEmail && existingEmail.id !== existingStudent.id) {
          return respond<ErrorResponse>(
            { error: 'Email já cadastrado' },
            409
          );
        }
      }
    }

    // Use Prisma transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if student exists (might be on priority list)
      const existingStudentInTx = await tx.student.findUnique({
        where: { cpf: cleanedCPF },
      });

      // Double-check: Verify student doesn't already have enrollment in this class
      // This prevents race conditions where enrollment was created between checks
      if (existingStudentInTx) {
        const finalEnrollmentCheck = await tx.enrollment.findUnique({
          where: {
            student_id_class_id: {
              student_id: existingStudentInTx.id,
              class_id: course.id,
            },
          },
        });

        if (finalEnrollmentCheck) {
          throw new Error('Você já está matriculado neste grupo');
        }
      }

      let newStudent;
      if (existingStudentInTx) {
        // Update existing student (clear priority list flags)
        newStudent = await tx.student.update({
          where: { id: existingStudentInTx.id },
          data: {
            nome: normalizeNameBR(student.nome.trim()),
            telefone: cleanedPhone,
            email: student.email && student.email.trim().length > 0 ? student.email.trim() : existingStudentInTx.email,
            genero: student.genero?.trim() || existingStudentInTx.genero,
            estado_civil: student.estado_civil?.trim() || existingStudentInTx.estado_civil,
            nascimento: student.nascimento ? new Date(student.nascimento) : existingStudentInTx.nascimento,
            cidade_preferencia: student.cidade_preferencia?.trim() || existingStudentInTx.cidade_preferencia,
            priority_list: false,
            priority_list_course_id: null,
            priority_list_added_at: null,
          },
        });
      } else {
        // Create Student record
        newStudent = await tx.student.create({
          data: {
            nome: normalizeNameBR(student.nome.trim()),
            cpf: cleanedCPF,
            telefone: cleanedPhone,
            email: student.email && student.email.trim().length > 0 ? student.email.trim() : null,
            genero: student.genero?.trim() || null,
            estado_civil: student.estado_civil?.trim() || null,
            nascimento: student.nascimento ? new Date(student.nascimento) : null,
            cidade_preferencia: student.cidade_preferencia?.trim() || null,
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
    return respond<RegisterResponse>(
      {
        success: true,
        enrollment_id: result.enrollment_id,
        student_id: result.student_id,
      },
      201
    );
  } catch (error: any) {
    console.error('Error registering student:', error);
    logger.error('request error', {
      requestId,
      route,
      method,
      duration_ms: Date.now() - start,
      err: error,
    });

    // Handle duplicate enrollment error from transaction
    if (error.message === 'Você já está matriculado neste grupo') {
      return respond<ErrorResponse>(
        { error: error.message },
        409
      );
    }

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

      return respond<ErrorResponse>(
        { error: errorMessage },
        409
      );
    }

    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return respond<ErrorResponse>(
        { error: 'Erro ao processar registro' },
        500
      );
    }

    // Handle general errors
    return respond<ErrorResponse>(
      { error: 'Erro interno do servidor' },
      500
    );
  }
}
