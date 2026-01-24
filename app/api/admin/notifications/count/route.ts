import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  try {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/notifications/count/route.ts:18',message:'Function entry - checking prisma client',data:{hasPrisma:!!prisma,prismaKeys:Object.keys(prisma).slice(0,10),hasNotificationRead:'notificationRead' in prisma},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const tokenPayload = await verifyAdminToken(request);
    const adminId = tokenPayload.adminId;

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/notifications/count/route.ts:24',message:'Before prisma.notificationRead.findMany',data:{adminId,hasNotificationRead:!!prisma.notificationRead,notificationReadType:typeof prisma.notificationRead},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

    return NextResponse.json({
      studentObservations: counts.studentObservations,
      sessionReports: counts.sessionReports,
      finalReports: counts.finalReports,
      total,
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);

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
