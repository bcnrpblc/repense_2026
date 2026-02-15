import { prisma } from '@/lib/prisma';

// ============================================================================
// NOTIFICATION CREATION HELPERS
// ============================================================================

/**
 * Create notification records for all admins when a report is created
 * 
 * @param notificationType - Type of notification
 * @param referenceId - ID of the Attendance, Session, or Class
 */
export async function createNotificationsForAllAdmins(
  notificationType: 'student_observation' | 'session_report' | 'final_report',
  referenceId: string
): Promise<void> {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/notifications.ts:13',message:'Function entry - createNotificationsForAllAdmins',data:{notificationType,referenceId,hasPrisma:!!prisma,hasNotificationRead:'notificationRead' in prisma},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Get all admins
    const admins = await prisma.admin.findMany({
      select: { id: true },
    });

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/notifications.ts:22',message:'After fetching admins',data:{adminCount:admins.length,hasNotificationRead:!!prisma.notificationRead},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (admins.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/notifications.ts:24',message:'No admins found - returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return; // No admins to notify
    }

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/notifications.ts:28',message:'Before prisma.notificationRead.createMany',data:{notificationType,referenceId,adminCount:admins.length,hasNotificationRead:!!prisma.notificationRead,notificationReadType:typeof prisma.notificationRead},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Create notification records for all admins (unread by default)
    const result = await prisma.notificationRead.createMany({
      data: admins.map((admin) => ({
        admin_id: admin.id,
        notification_type: notificationType,
        reference_id: referenceId,
        read_at: null, // Unread
      })),
      skipDuplicates: true, // Skip if already exists (unique constraint)
    });
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/notifications.ts:36',message:'After createMany - success',data:{count:result.count},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/notifications.ts:38',message:'Error creating notifications',data:{error:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Error creating notifications:', error);
    // Don't throw - notification creation failure shouldn't break report creation
  }
}

// ============================================================================
// ADMIN NOTIFICATIONS: TEACHER MESSAGE
// ============================================================================

/**
 * Create or reset unread notification for all admins when a teacher sends a message
 * in a conversation. Uses type 'teacher_message' and reference_id = conversationId.
 * If an admin already has a notification for this conversation, sets read_at to null.
 */
export async function notifyAdminsOfTeacherMessage(conversationId: string): Promise<void> {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true },
    });
    if (admins.length === 0) return;

    const type = 'teacher_message' as const;
    for (const admin of admins) {
      await prisma.notificationRead.upsert({
        where: {
          admin_id_notification_type_reference_id: {
            admin_id: admin.id,
            notification_type: type,
            reference_id: conversationId,
          },
        },
        create: {
          admin_id: admin.id,
          notification_type: type,
          reference_id: conversationId,
          read_at: null,
        },
        update: {
          read_at: null,
        },
      });
    }
  } catch (error) {
    console.error('Error notifying admins of teacher message:', error);
  }
}
