import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ============================================================================
// GET /api/admin/notifications/count
// ============================================================================

/**
 * Get unread notification counts per type for current admin
 * 
 * Returns:
 * - studentObservations: count of unread student observation reports
 * - sessionReports: count of unread session reports
 * - finalReports: count of unread final class reports
 * - total: sum of all unread notifications
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';
  const route = '/api/admin/notifications/count';
  const method = request.method;
  const start = Date.now();
  logger.info('request start', { requestId, route, method });
  const respond = (body: Record<string, unknown>, status: number) => {
    logger.info('request end', {
      requestId,
      route,
      method,
      status,
      duration_ms: Date.now() - start,
    });
    return NextResponse.json(body, { status });
  };

  try {
    const tokenPayload = await verifyAdminToken(request);
    const adminId = tokenPayload.adminId;
    // Get all unread notifications for this admin
    const unreadNotifications = await prisma.notificationRead.findMany({
      where: {
        admin_id: adminId,
        read_at: null,
      },
      select: {
        notification_type: true,
      },
    });

    // Count by type
    const counts = {
      studentObservations: 0,
      sessionReports: 0,
      finalReports: 0,
    };

    unreadNotifications.forEach((notification) => {
      if (notification.notification_type === 'student_observation') {
        counts.studentObservations++;
      } else if (notification.notification_type === 'session_report') {
        counts.sessionReports++;
      } else if (notification.notification_type === 'final_report') {
        counts.finalReports++;
      }
    });

    const total = counts.studentObservations + counts.sessionReports + counts.finalReports;

    return respond({
      studentObservations: counts.studentObservations,
      sessionReports: counts.sessionReports,
      finalReports: counts.finalReports,
      total,
    }, 200);
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    logger.error('request error', {
      requestId,
      route,
      method,
      duration_ms: Date.now() - start,
      err: error,
    });

    if (error instanceof Error) {
      if (
        error.message.includes('token') ||
        error.message.includes('authorization') ||
        error.message.includes('expired')
      ) {
        return respond({ error: 'Não autorizado' }, 401);
      }
    }

    return respond({ error: 'Erro interno do servidor' }, 500);
  }
}
