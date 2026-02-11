import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/notifications/count
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    const count = await prisma.teacherNotificationRead.count({
      where: {
        teacher_id: teacherId,
        read_at: null,
      },
    });

    return NextResponse.json({ total: count });
  } catch (error) {
    console.error('Error in GET /api/teacher/notifications/count:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    );
  }
}
