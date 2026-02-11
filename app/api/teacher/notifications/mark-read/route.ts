import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  type: z.enum(['leader_message']).optional(),
  referenceId: z.string().uuid().optional(),
}).refine(
  (data) => data.notificationIds?.length || (data.type && data.referenceId),
  { message: 'Provide notificationIds or both type and referenceId' }
);

// ============================================================================
// POST /api/teacher/notifications/mark-read
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', validation_errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.notificationIds && parsed.data.notificationIds.length > 0) {
      await prisma.teacherNotificationRead.updateMany({
        where: {
          id: { in: parsed.data.notificationIds },
          teacher_id: teacherId,
          read_at: null,
        },
        data: { read_at: new Date() },
      });
      return NextResponse.json({
        success: true,
        message: 'Notificação(ões) marcada(s) como lida(s)',
      });
    }

    if (parsed.data.type && parsed.data.referenceId) {
      await prisma.teacherNotificationRead.updateMany({
        where: {
          teacher_id: teacherId,
          notification_type: parsed.data.type,
          reference_id: parsed.data.referenceId,
        },
        data: { read_at: new Date() },
      });
      return NextResponse.json({
        success: true,
        message: 'Notificação marcada como lida',
      });
    }

    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/teacher/notifications/mark-read:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao marcar notificação' },
      { status: 500 }
    );
  }
}
