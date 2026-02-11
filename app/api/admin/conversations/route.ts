import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const createConversationSchema = z.object({
  classId: z.string().min(1, 'classId é obrigatório'),
  studentId: z.string().uuid().optional().nullable(),
});

// ============================================================================
// GET /api/admin/conversations
// ============================================================================
// List all conversations with class, student, teacher, last message. Auth: admin.

export async function GET(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const conversations = await prisma.conversation.findMany({
      include: {
        Student: { select: { id: true, nome: true } },
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
            Teacher: { select: { id: true, nome: true, email: true } },
          },
        },
        _count: { select: { Message: true } },
        Message: {
          orderBy: { criado_em: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            criado_em: true,
            sender_type: true,
          },
        },
      },
      orderBy: { criado_em: 'desc' },
    });

    const list = conversations.map((c) => ({
      id: c.id,
      classId: c.class_id,
      studentId: c.student_id,
      class: c.Class,
      student: c.Student,
      teacher: c.Class.Teacher,
      lastMessage: c.Message[0] ?? null,
      messageCount: c._count.Message,
    }));

    return NextResponse.json({ conversations: list });
  } catch (error) {
    console.error('Error in GET /api/admin/conversations:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao listar conversas' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/admin/conversations
// ============================================================================
// Create conversation (body: classId, optional studentId). Idempotent: return existing if already exists.

export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', validation_errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { classId, studentId } = parsed.data;
    const studentIdOrNull = studentId ?? null;

    const classExists = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!classExists) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    if (studentIdOrNull) {
      const studentInClass = await prisma.enrollment.findFirst({
        where: {
          class_id: classId,
          student_id: studentIdOrNull,
          status: 'ativo',
        },
      });
      if (!studentInClass) {
        return NextResponse.json(
          { error: 'Participante não encontrado nesta turma' },
          { status: 404 }
        );
      }
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        class_id: classId,
        student_id: studentIdOrNull,
      },
      include: {
        Student: { select: { id: true, nome: true } },
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
            Teacher: {
              select: { id: true, nome: true, email: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          class_id: classId,
          student_id: studentIdOrNull,
        },
        include: {
          Student: { select: { id: true, nome: true } },
          Class: {
            select: {
              id: true,
              grupo_repense: true,
              horario: true,
              Teacher: {
                select: { id: true, nome: true, email: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error in POST /api/admin/conversations:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao criar conversa' },
      { status: 500 }
    );
  }
}
