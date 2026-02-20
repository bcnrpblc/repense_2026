import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const sendMessageSchema = z.object({
  body: z.string().min(1, 'Mensagem não pode ser vazia').max(5000),
});

// ============================================================================
// GET /api/admin/conversations/[id]/messages
// ============================================================================
// List messages (oldest first). Auth: admin.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminOrTeacherAdminToken(request);
    const conversationId = params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
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
    console.error('Error in GET /api/admin/conversations/[id]/messages:', error);
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
// POST /api/admin/conversations/[id]/messages
// ============================================================================
// Send message (body: body). Auth: admin; set sender_admin_id from token.

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyAdminOrTeacherAdminToken(request);
    const adminId = tokenPayload.adminId;
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
      select: { id: true, Class: { select: { id: true, teacher_id: true } } },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const message = await prisma.message.create({
      data: {
        conversation_id: conversationId,
        body: parsed.data.body.trim(),
        sender_type: 'admin',
        sender_admin_id: adminId,
        sender_teacher_id: null,
      },
      select: {
        id: true,
        body: true,
        sender_type: true,
        criado_em: true,
        Admin: {
          select: { id: true, email: true },
        },
      },
    });

    // Notify main teacher and co-leader (teacher with co_lider_class_id = this class)
    const mainTeacherId = conversation.Class?.teacher_id ?? null;
    const coLeader = conversation.Class?.id
      ? await prisma.teacher.findFirst({
          where: { co_lider_class_id: conversation.Class.id },
          select: { id: true },
        })
      : null;
    const coLeaderId = coLeader?.id ?? null;
    const teacherIdsToNotify = [mainTeacherId, coLeaderId].filter(
      (id): id is string => !!id && id.length > 0
    );
    const uniqueIds = [...new Set(teacherIdsToNotify)];

    for (const teacherId of uniqueIds) {
      const existing = await prisma.teacherNotificationRead.findFirst({
        where: {
          teacher_id: teacherId,
          notification_type: 'leader_message',
          reference_id: conversationId,
        },
      });
      if (existing) {
        await prisma.teacherNotificationRead.update({
          where: { id: existing.id },
          data: { read_at: null },
        });
      } else {
        await prisma.teacherNotificationRead.create({
          data: {
            teacher_id: teacherId,
            notification_type: 'leader_message',
            reference_id: conversationId,
            read_at: null,
          },
        });
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/conversations/[id]/messages:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}
