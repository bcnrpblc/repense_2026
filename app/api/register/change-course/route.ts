import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanCPF } from '@/lib/utils/cpf';
import { transferStudent } from '@/lib/enrollment';

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
  try {
    const body: ChangeCourseRequest = await request.json();
    const { cpf, student_id, new_class_id, old_enrollment_id } = body;

    // Validate request structure
    if (!cpf || !student_id || !new_class_id || !old_enrollment_id) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing required fields: cpf, student_id, new_class_id, and old_enrollment_id are required' },
        { status: 400 }
      );
    }

    // Clean CPF
    const cleanedCPF = cleanCPF(cpf);

    // Verify student exists and matches CPF
    const student = await prisma.student.findUnique({
      where: { id: student_id },
    });

    if (!student) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Estudante não encontrado' },
        { status: 404 }
      );
    }

    if (student.cpf !== cleanedCPF) {
      return NextResponse.json<ErrorResponse>(
        { error: 'CPF não corresponde ao estudante' },
        { status: 403 }
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
      return NextResponse.json<ErrorResponse>(
        { error: 'Inscrição anterior não encontrada' },
        { status: 404 }
      );
    }

    if (oldEnrollment.student_id !== student_id) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Inscrição não pertence a este estudante' },
        { status: 403 }
      );
    }

    if (oldEnrollment.status !== 'ativo') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Inscrição anterior não está ativa' },
        { status: 400 }
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
      },
    });

    if (!newClass) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Novo grupo não encontrado' },
        { status: 404 }
      );
    }

    if (!newClass.eh_ativo) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Novo grupo não está ativo' },
        { status: 400 }
      );
    }

    // Determine if this is a transfer (same grupo) or course change (different grupo)
    const isSameGrupo = newClass.grupo_repense === oldEnrollment.Class.grupo_repense;

    // Check capacity
    if (newClass.numero_inscritos >= newClass.capacidade) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Novo grupo está lotado' },
        { status: 409 }
      );
    }

    // Check if trying to transfer to the same class
    if (oldEnrollment.class_id === new_class_id) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Você já está matriculado nesta turma' },
        { status: 400 }
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
      return NextResponse.json<ErrorResponse>(
        { error: 'você já concluiu esse PG Repense' },
        { status: 409 }
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

    // Return success response
    return NextResponse.json<ChangeCourseResponse>(
      {
        success: true,
        enrollment_id: newEnrollmentId,
        message: isSameGrupo ? 'Curso alterado com sucesso' : 'Inscrição realizada com sucesso',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error changing course:', error);

    // Handle enrollment errors
    if (error.name === 'EnrollmentError') {
      return NextResponse.json<ErrorResponse>(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('student_id') && target.includes('class_id')) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Você já está inscrito neste curso' },
          { status: 409 }
        );
      }
    }

    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Erro ao processar alteração de curso' },
        { status: 500 }
      );
    }

    // Handle general errors
    return NextResponse.json<ErrorResponse>(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
