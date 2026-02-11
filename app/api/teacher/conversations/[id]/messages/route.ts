import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const sendMessageSchema = z.object({
  body: z.string().min(1, 'Mensagem não pode ser vazia').max(5000),
});

// ============================================================================
// GET /api/teacher/conversations/[id]/messages
// ============================================================================
// List messages. Auth: teacher owns the class.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const conversationId = params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        Class: { select: { teacher_id: true } },
      },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }
    if (conversation.Class.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta conversa' },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { criado_em: 'asc' },
      select: {
        id: true,
        body: true,
        sender_type: true,
        sender_admin_id: true,
        sender_teacher_id: true,
        criado_em: true,
        Admin: {
          select: { id: true, email: true },
        },
        Teacher: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error in GET /api/teacher/conversations/[id]/messages:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao listar mensagens' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/teacher/conversations/[id]/messages
// ============================================================================
// Reply. Auth: teacher; set sender_teacher_id from token.

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
    const conversationId = params.id;

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Mensagem inválida', validation_errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { Class: { select: { teacher_id: true } } },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }
    if (conversation.Class.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta conversa' },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        conversation_id: conversationId,
        body: parsed.data.body.trim(),
        sender_type: 'teacher',
        sender_admin_id: null,
        sender_teacher_id: teacherId,
      },
      select: {
        id: true,
        body: true,
        sender_type: true,
        criado_em: true,
        Teacher: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teacher/conversations/[id]/messages:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}
