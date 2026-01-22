import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transferStudent, EnrollmentError } from '@/lib/enrollment';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const moveStudentSchema = z.object({
  studentId: z.string().uuid(),
  newClassId: z.string().uuid(),
});

// ============================================================================
// POST /api/admin/classes/[id]/move-student
// ============================================================================

/**
 * Move a student from current class to a new class
 * Uses the transferStudent function from lib/enrollment.ts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const { studentId, newClassId } = moveStudentSchema.parse(body);

    const currentClassId = params.id;

    // Verify current class exists
    const currentClass = await prisma.class.findUnique({
      where: { id: currentClassId },
      select: {
        id: true,
        grupo_repense: true,
      },
    });

    if (!currentClass) {
      return NextResponse.json(
        { error: 'Grupo atual não encontrado' },
        { status: 404 }
      );
    }

    // Verify new class exists and has same grupo_repense
    const newClass = await prisma.class.findUnique({
      where: { id: newClassId },
      select: {
        id: true,
        grupo_repense: true,
        eh_ativo: true,
        capacidade: true,
        numero_inscritos: true,
      },
    });

    if (!newClass) {
      return NextResponse.json(
        { error: 'Novo grupo não encontrado' },
        { status: 404 }
      );
    }

    // Validate same grupo_repense
    if (newClass.grupo_repense !== currentClass.grupo_repense) {
      return NextResponse.json(
        { error: 'Transferência só é permitida entre grupos do mesmo grupo' },
        { status: 400 }
      );
    }

    // Find the active enrollment for this student in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        class_id: currentClassId,
        status: 'ativo',
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscrição ativa não encontrada para este participante nesse grupo' },
        { status: 404 }
      );
    }

    // Use the transferStudent function
    const result = await transferStudent(enrollment.id, newClassId);

    return NextResponse.json({
      message: 'Participante transferido com sucesso',
      oldEnrollment: result.oldEnrollment,
      newEnrollment: result.newEnrollment,
    });

  } catch (error) {
    console.error('Error moving student:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof EnrollmentError) {
      const messages: Record<string, string> = {
        'Enrollment not found': 'Inscrição não encontrada',
        'Enrollment is not active': 'Inscrição não está ativa',
        'New class not found': 'Novo grupo não encontrado',
        'New class inactive': 'Novo grupo está inativo',
        'New class full': 'Novo grupo está lotado',
      };
      return NextResponse.json(
        { error: messages[error.message] || error.message },
        { status: 400 } 
      );
    }

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
