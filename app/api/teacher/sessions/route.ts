import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSessionSchema = z.object({
  classId: z.string().min(1, 'classId é obrigatório'),
});

// ============================================================================
// POST /api/teacher/sessions
// ============================================================================

/**
 * Create a new session for a class
 * 
 * Business Rules:
 * - Teacher must own the class
 * - Teacher cannot have another active session (relatorio = null)
 * - Session numero_sessao is auto-incremented
 * - data_sessao is set to now
 * 
 * Request Body:
 * { classId: string }
 * 
 * Response:
 * - 201: Session created with student list
 * - 400: Validation error or teacher has active session
 * - 401: Unauthorized
 * - 403: Teacher doesn't own this class
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify teacher authentication
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    // Parse and validate request body
    const body = await request.json();
    const { classId } = createSessionSchema.parse(body);

    // Verify teacher owns this class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        Teacher: true,
        enrollments: {
          where: { status: 'ativo' },
          include: {
            student: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    if (classData.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para criar sessões nesta turma' },
        { status: 403 }
      );
    }

    // Check if teacher has any active session (in ANY class)
    const activeSession = await prisma.session.findFirst({
      where: {
        Class: {
          teacher_id: teacherId,
        },
        relatorio: null, // null means session is still active
      },
      include: {
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
          },
        },
      },
    });

    if (activeSession) {
      return NextResponse.json(
        {
          error: 'Você já tem uma sessão ativa',
          activeSession: {
            id: activeSession.id,
            classId: activeSession.Class.id,
            className: `${activeSession.Class.grupo_repense} - ${activeSession.Class.horario}`,
            numero_sessao: activeSession.numero_sessao,
          },
        },
        { status: 400 }
      );
    }

    // Get the last session number for this class
    const lastSession = await prisma.session.findFirst({
      where: { class_id: classId },
      orderBy: { numero_sessao: 'desc' },
      select: { numero_sessao: true },
    });

    const nextSessionNumber = (lastSession?.numero_sessao || 0) + 1;

    // Create new session
    const newSession = await prisma.session.create({
      data: {
        id: randomUUID(),
        class_id: classId,
        numero_sessao: nextSessionNumber,
        data_sessao: new Date(),
        relatorio: null, // null means session is active
      },
      include: {
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            horario: true,
            eh_itu: true,
            numero_sessoes: true,
          },
        },
      },
    });

    // Prepare student list for attendance
    const students = classData.enrollments.map((enrollment) => ({
      studentId: enrollment.student.id,
      nome: enrollment.student.nome,
      email: enrollment.student.email,
      telefone: enrollment.student.telefone,
    }));

    return NextResponse.json(
      {
        session: {
          id: newSession.id,
          numero_sessao: newSession.numero_sessao,
          data_sessao: newSession.data_sessao,
          relatorio: newSession.relatorio,
          class: {
            id: newSession.Class.id,
            grupo_repense: newSession.Class.grupo_repense,
            modelo: newSession.Class.modelo,
            horario: newSession.Class.horario,
            cidade: newSession.Class.eh_itu ? 'Itu' : 'Indaiatuba',
            numero_sessoes: newSession.Class.numero_sessoes,
          },
        },
        students,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating session:', error);

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
