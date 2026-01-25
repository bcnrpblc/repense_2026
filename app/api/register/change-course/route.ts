import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanCPF } from '@/lib/utils/cpf';
import { transferStudent } from '@/lib/enrollment';
import { logger } from '@/lib/logger';

type ChangeCourseRequest = {
  cpf: string;
  student_id: string;
  new_class_id: string;
  old_enrollment_id: string;
};

type ChangeCourseResponse = {
  success: true;
  enrollment_id: string;
  message: string;
};

type ErrorResponse = {
  error: string;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';
  const route = '/api/register/change-course';
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
    const body: ChangeCourseRequest = await request.json();
    const { cpf, student_id, new_class_id, old_enrollment_id } = body;

    // Validate request structure
    if (!cpf || !student_id || !new_class_id || !old_enrollment_id) {
      return respond<ErrorResponse>(
        { error: 'Missing required fields: cpf, student_id, new_class_id, and old_enrollment_id are required' },
        400
      );
    }

    // Clean CPF
    const cleanedCPF = cleanCPF(cpf);

    // Verify student exists and matches CPF
    const student = await prisma.student.findUnique({
      where: { id: student_id },
    });

    if (!student) {
      return respond<ErrorResponse>(
        { error: 'Estudante não encontrado' },
        404
      );
    }

    if (student.cpf !== cleanedCPF) {
      return respond<ErrorResponse>(
        { error: 'CPF não corresponde ao estudante' },
        403
      );
    }

    // Verify old enrollment exists and is active
    const oldEnrollment = await prisma.enrollment.findUnique({
      where: { id: old_enrollment_id },
      include: {
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            eh_ativo: true,
          },
        },
      },
    });

    if (!oldEnrollment) {
      return respond<ErrorResponse>(
        { error: 'Inscrição anterior não encontrada' },
        404
      );
    }

    if (oldEnrollment.student_id !== student_id) {
      return respond<ErrorResponse>(
        { error: 'Inscrição não pertence a este estudante' },
        403
      );
    }

    if (oldEnrollment.status !== 'ativo') {
      return respond<ErrorResponse>(
        { error: 'Inscrição anterior não está ativa' },
        400
      );
    }

    // Verify new class exists and has capacity
    const newClass = await prisma.class.findUnique({
      where: { id: new_class_id },
      select: {
        id: true,
        grupo_repense: true,
        eh_ativo: true,
        capacidade: true,
        numero_inscritos: true,
        cidade: true,
      },
    });

    if (!newClass) {
      return respond<ErrorResponse>(
        { error: 'Novo grupo não encontrado' },
        404
      );
    }

    if (!newClass.eh_ativo) {
      return respond<ErrorResponse>(
        { error: 'Novo grupo não está ativo' },
        400
      );
    }

    // Determine if this is a transfer (same grupo) or course change (different grupo)
    const isSameGrupo = newClass.grupo_repense === oldEnrollment.Class.grupo_repense;

    // Check capacity
    if (newClass.numero_inscritos >= newClass.capacidade) {
      return respond<ErrorResponse>(
        { error: 'Novo grupo está lotado' },
        409
      );
    }

    // Check if trying to transfer to the same class
    if (oldEnrollment.class_id === new_class_id) {
      return respond<ErrorResponse>(
        { error: 'Você já está matriculado neste grupo' },
        400
      );
    }

    // Check if student already has an enrollment in the new class
    const existingEnrollmentInNewClass = await prisma.enrollment.findUnique({
      where: {
        student_id_class_id: {
          student_id: student_id,
          class_id: new_class_id,
        },
      },
    });

    if (
      existingEnrollmentInNewClass &&
      existingEnrollmentInNewClass.id !== old_enrollment_id &&
      existingEnrollmentInNewClass.status === 'concluido'
    ) {
      return respond<ErrorResponse>(
        { error: 'você já concluiu esse PG Repense' },
        409
      );
    }

    // Handle based on grupo_repense
    let newEnrollmentId: string;
    
    if (isSameGrupo) {
      // Same grupo: Transfer (cancel old, create new in same grupo)
      const result = await transferStudent(old_enrollment_id, new_class_id);
      newEnrollmentId = result.newEnrollment.id;
    } else {
      // Different grupo: Cancel old enrollment and create new one
      
      const result = await prisma.$transaction(async (tx) => {
        // Cancel old enrollment
        await tx.enrollment.update({
          where: { id: old_enrollment_id },
          data: {
            status: 'cancelado',
            cancelado_em: new Date(),
          },
        });

        // Decrement old class enrollment count
        await tx.class.update({
          where: { id: oldEnrollment.class_id },
          data: {
            numero_inscritos: {
              decrement: 1,
            },
          },
        });

        const targetEnrollment = await tx.enrollment.findFirst({
          where: {
            student_id: student_id,
            class_id: new_class_id,
          },
        });

        if (targetEnrollment?.status === 'ativo') {
          return { enrollmentId: targetEnrollment.id, didIncrement: false };
        }

        // Lock and check new class capacity atomically
        const newClassLocked = await tx.class.findUnique({
          where: { id: new_class_id },
          select: {
            eh_ativo: true,
            capacidade: true,
            numero_inscritos: true,
          },
        });

        if (!newClassLocked || !newClassLocked.eh_ativo) {
          throw new Error('Novo grupo não está ativo');
        }

        if (newClassLocked.numero_inscritos >= newClassLocked.capacidade) {
          throw new Error('Novo grupo está lotado');
        }

        let enrollmentId: string;
        if (targetEnrollment) {
          const reactivatedEnrollment = await tx.enrollment.update({
            where: { id: targetEnrollment.id },
            data: {
              status: 'ativo',
              cancelado_em: null,
              concluido_em: null,
              transferido_de_class_id: oldEnrollment.class_id,
            },
          });
          enrollmentId = reactivatedEnrollment.id;
        } else {
          const newEnrollment = await tx.enrollment.create({
            data: {
              student_id: student_id,
              class_id: new_class_id,
              status: 'ativo',
              transferido_de_class_id: oldEnrollment.class_id,
            },
          });
          enrollmentId = newEnrollment.id;
        }

        // Increment new class enrollment count
        await tx.class.update({
          where: { id: new_class_id },
          data: {
            numero_inscritos: {
              increment: 1,
            },
          },
        });

        return { enrollmentId, didIncrement: true };
      });

      newEnrollmentId = result.enrollmentId;
    }

    // Update student's cidade_preferencia if city changed
    if (newClass.cidade && newClass.cidade !== student.cidade_preferencia) {
      await prisma.student.update({
        where: { id: student_id },
        data: { cidade_preferencia: newClass.cidade },
      });
    }

    // Return success response
    return respond<ChangeCourseResponse>(
      {
        success: true,
        enrollment_id: newEnrollmentId,
        message: isSameGrupo ? 'Curso alterado com sucesso' : 'Inscrição realizada com sucesso',
      },
      200
    );
  } catch (error: any) {
    console.error('Error changing course:', error);
    logger.error('request error', {
      requestId,
      route,
      method,
      duration_ms: Date.now() - start,
      err: error,
    });

    // Handle enrollment errors
    if (error.name === 'EnrollmentError') {
      return respond<ErrorResponse>(
        { error: error.message },
        400
      );
    }

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('student_id') && target.includes('class_id')) {
        return respond<ErrorResponse>(
          { error: 'Você já está inscrito neste curso' },
          409
        );
      }
    }

    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return respond<ErrorResponse>(
        { error: 'Erro ao processar alteração de curso' },
        500
      );
    }

    // Handle general errors
    return respond<ErrorResponse>(
      { error: error.message || 'Erro interno do servidor' },
      500
    );
  }
}
