import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        Class: {
          teacher_id: teacherId,
        },
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
