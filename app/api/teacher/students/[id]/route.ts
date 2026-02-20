import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeNameBR } from '@/lib/utils/names';
import { cleanPhone } from '@/lib/utils/phone';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const updateStudentSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().nullable(),
});

// ============================================================================
// PUT /api/teacher/students/[id]
// ============================================================================

/**
 * Update student information (limited fields for teachers)
 * 
 * Teachers can only edit: nome, telefone, email
 * 
 * Requires:
 * - Teacher must own a class where student is enrolled
 * - Valid student ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const studentId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateStudentSchema.parse(body);

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Participante não encontrado' },
        { status: 404 }
      );
    }

    // Verify teacher owns or co-leads a class where this student is enrolled
    const teacherRow = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { co_lider_class_id: true },
    });
    const coLiderClassId = teacherRow?.co_lider_class_id ?? null;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        status: 'ativo',
        Class: {
          OR: [
            { teacher_id: teacherId },
            ...(coLiderClassId ? [{ id: coLiderClassId }] : []),
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar este participante' },
        { status: 403 }
      );
    }

    // Validate phone format (10-15 digits after cleaning)
    const cleanedPhone = cleanPhone(validatedData.telefone);
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return NextResponse.json(
        { error: 'Telefone deve ter entre 10 e 15 dígitos' },
        { status: 400 }
      );
    }

    // Check for duplicate email (if email is provided and different from current)
    if (validatedData.email && validatedData.email !== student.email) {
      const emailExists = await prisma.student.findFirst({
        where: {
          email: validatedData.email,
          id: { not: studentId },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado para outro participante' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate phone (if different from current)
    if (cleanedPhone !== student.telefone) {
      const phoneExists = await prisma.student.findFirst({
        where: {
          telefone: cleanedPhone,
          id: { not: studentId },
        },
      });

      if (phoneExists) {
        return NextResponse.json(
          { error: 'Este telefone já está cadastrado para outro participante' },
          { status: 400 }
        );
      }
    }

    // Build update data (only allowed fields)
    const updateData = {
      nome: normalizeNameBR(validatedData.nome.trim()),
      telefone: cleanedPhone,
      email: validatedData.email?.trim() || null,
    };

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
    });

    // Log edit (console for MVP - no audit table)
    console.log(`Teacher ${teacherId} edited student ${studentId}:`, {
      fields: ['nome', 'telefone', 'email'],
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Participante atualizado com sucesso',
      student: {
        id: updatedStudent.id,
        nome: updatedStudent.nome,
        email: updatedStudent.email,
        telefone: updatedStudent.telefone,
      },
    });
  } catch (error) {
    console.error('Error updating student:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes('token') ||
        error.message.includes('authorization') ||
        error.message.includes('expired')
      ) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
