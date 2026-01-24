import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  type: z.enum(['student_observation', 'session_report', 'final_report']).optional(),
  referenceId: z.string().optional(),
}).refine(
  (data) => data.notificationIds || (data.type && data.referenceId),
  {
    message: 'Either notificationIds or both type and referenceId must be provided',
  }
);

// ============================================================================
// POST /api/admin/notifications/mark-read
// ============================================================================

/**
 * Mark notifications as read for current admin
 * 
 * Body options:
 * 1. { notificationIds: string[] } - Mark specific notifications by ID
 * 2. { type: string, referenceId: string } - Mark notification by type and reference
 * 
 * Only marks as read for the current admin (per-admin tracking)
 */
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAdminToken(request);
    const adminId = tokenPayload.adminId;

    const body = await request.json();
    const parsed = markReadSchema.parse(body);

    if (parsed.notificationIds && parsed.notificationIds.length > 0) {
      // Mark specific notifications by ID
      await prisma.notificationRead.updateMany({
        where: {
          id: { in: parsed.notificationIds },
          admin_id: adminId,
          read_at: null, // Only update unread ones
        },
        data: {
          read_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${parsed.notificationIds.length} notificação(ões) marcada(s) como lida(s)`,
      });
    } else if (parsed.type && parsed.referenceId) {
      // Mark by type and reference
      const updated = await prisma.notificationRead.updateMany({
        where: {
          admin_id: adminId,
          notification_type: parsed.type,
          reference_id: parsed.referenceId,
          read_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Notificação marcada como lida',
        count: updated.count,
      });
    }

    return NextResponse.json(
      { error: 'Dados inválidos' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);

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
