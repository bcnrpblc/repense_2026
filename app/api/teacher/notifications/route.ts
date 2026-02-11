import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/notifications
// ============================================================================
// List unread notifications for current teacher (leader_message type with conversation/class preview).

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    const rows = await prisma.teacherNotificationRead.findMany({
      where: {
        teacher_id: teacherId,
        read_at: null,
      },
      orderBy: { criado_em: 'desc' },
      take: 50,
    });

    const notifications = await Promise.all(
      rows.map(async (nr) => {
        if (nr.notification_type !== 'leader_message') return null;
        const conv = await prisma.conversation.findUnique({
          where: { id: nr.reference_id },
          include: {
            Class: {
              select: {
                id: true,
                grupo_repense: true,
                horario: true,
              },
            },
            Student: { select: { id: true, nome: true } },
            Message: {
              orderBy: { criado_em: 'desc' },
              take: 1,
              select: { body: true, criado_em: true },
            },
          },
        });
        if (!conv) return null;
        return {
          id: nr.id,
          type: 'leader_message' as const,
          referenceId: nr.reference_id,
          conversationId: nr.reference_id,
          createdAt: nr.criado_em,
          class: conv.Class,
          student: conv.Student,
          preview: conv.Message[0]?.body?.slice(0, 80) ?? '',
        };
      })
    );

    const filtered = notifications.filter(Boolean);

    return NextResponse.json({ notifications: filtered });
  } catch (error) {
    console.error('Error in GET /api/teacher/notifications:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao listar notificações' },
      { status: 500 }
    );
  }
}
