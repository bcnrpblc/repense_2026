import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyAdminsOfTeacherMessage } from '@/lib/notifications';

const createSchema = z.object({
  class_id: z.string().min(1, 'Turma é obrigatória'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .max(1000, 'Mensagem deve ter no máximo 1000 caracteres'),
});

// ============================================================================
// GET /api/teacher/conversations
// ============================================================================
// List conversations for classes assigned to this teacher (with last message preview).

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    const conversations = await prisma.conversation.findMany({
      where: {
        Class: { teacher_id: teacherId },
      },
      include: {
        Student: {
          select: { id: true, nome: true },
        },
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
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
      lastMessage: c.Message[0] ?? null,
      messageCount: c._count.Message,
    }));

    return NextResponse.json({ conversations: list });
  } catch (error) {
    console.error('Error in GET /api/teacher/conversations:', error);
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
// POST /api/teacher/conversations
// ============================================================================
// Teacher starts a conversation about one of their active classes (body: class_id, message).
// Finds or creates the class-level thread (class_id, student_id null), adds first message.

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', validation_errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { class_id, message } = parsed.data;

    const classRecord = await prisma.class.findUnique({
      where: { id: class_id },
      select: { id: true, teacher_id: true, eh_ativo: true },
    });
    if (!classRecord) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }
    if (classRecord.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não é o facilitador desta turma' },
        { status: 403 }
      );
    }
    if (!classRecord.eh_ativo) {
      return NextResponse.json(
        { error: 'Só é possível iniciar conversa para turmas ativas' },
        { status: 400 }
      );
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        class_id,
        student_id: null,
      },
    });

    const existed = !!conversation;
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          class_id,
          student_id: null,
        },
      });
    }

    await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        body: message.trim(),
        sender_type: 'teacher',
        sender_admin_id: null,
        sender_teacher_id: teacherId,
      },
    });

    await notifyAdminsOfTeacherMessage(conversation.id);

    return NextResponse.json({
      conversation_id: conversation.id,
      existing: existed,
    });
  } catch (error) {
    console.error('Error in POST /api/teacher/conversations:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao criar conversa' },
      { status: 500 }
    );
  }
}
