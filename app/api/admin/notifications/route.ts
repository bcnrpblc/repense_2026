import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/notifications
// ============================================================================

/**
 * Get list of unread notifications for current admin
 * 
 * Query params:
 * - type (optional): 'student_observation' | 'session_report' | 'final_report'
 * 
 * Returns unified list sorted by most recent first
 */
export async function GET(request: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/notifications/route.ts:17',message:'Function entry - checking prisma client',data:{hasPrisma:!!prisma,prismaKeys:Object.keys(prisma).slice(0,10),hasNotificationRead:'notificationRead' in prisma},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const tokenPayload = await verifyAdminOrTeacherAdminToken(request);
    const adminId = tokenPayload.adminId;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Build where clause
    const where: any = {
      admin_id: adminId,
      read_at: null,
    };

    if (type && ['student_observation', 'session_report', 'final_report'].includes(type)) {
      where.notification_type = type;
    }

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/aa8eef57-c6f3-4787-9153-8fc4c14a5451',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/notifications/route.ts:36',message:'Before prisma.notificationRead.findMany',data:{adminId,hasNotificationRead:!!prisma.notificationRead,notificationReadType:typeof prisma.notificationRead,where},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Get unread notifications
    const notificationReads = await prisma.notificationRead.findMany({
      where,
      orderBy: {
        criado_em: 'desc',
      },
      take: 50, // Limit to 50 most recent
    });

    // Fetch details for each notification type
    const notifications = await Promise.all(
      notificationReads.map(async (nr) => {
        if (nr.notification_type === 'student_observation') {
          // Fetch attendance with student and session info
          const attendance = await prisma.attendance.findUnique({
            where: { id: nr.reference_id },
            include: {
              students: {
                select: {
                  id: true,
                  nome: true,
                },
              },
              Session: {
                include: {
                  Class: {
                    select: {
                      id: true,
                      grupo_repense: true,
                      horario: true,
                    },
                  },
                },
              },
            },
          });

          if (!attendance || !attendance.observacao) {
            return null;
          }

          return {
            id: nr.id,
            type: 'student_observation',
            referenceId: nr.reference_id,
            createdAt: nr.criado_em,
            student: {
              id: attendance.students.id,
              nome: attendance.students.nome,
            },
            session: {
              id: attendance.Session.id,
              numero_sessao: attendance.Session.numero_sessao,
              data_sessao: attendance.Session.data_sessao,
            },
            class: {
              id: attendance.Session.Class.id,
              grupo_repense: attendance.Session.Class.grupo_repense,
              horario: attendance.Session.Class.horario,
            },
            preview: attendance.observacao.substring(0, 100) + (attendance.observacao.length > 100 ? '...' : ''),
            fullText: attendance.observacao,
          };
        } else if (nr.notification_type === 'session_report') {
          // Fetch session with class info
          const session = await prisma.session.findUnique({
            where: { id: nr.reference_id },
            include: {
              Class: {
                select: {
                  id: true,
                  grupo_repense: true,
                  horario: true,
                },
              },
            },
          });

          if (!session || !session.relatorio) {
            return null;
          }

          return {
            id: nr.id,
            type: 'session_report',
            referenceId: nr.reference_id,
            createdAt: nr.criado_em,
            session: {
              id: session.id,
              numero_sessao: session.numero_sessao,
              data_sessao: session.data_sessao,
            },
            class: {
              id: session.Class.id,
              grupo_repense: session.Class.grupo_repense,
              horario: session.Class.horario,
            },
            preview: session.relatorio.substring(0, 100) + (session.relatorio.length > 100 ? '...' : ''),
            fullText: session.relatorio,
          };
        } else if (nr.notification_type === 'final_report') {
          // Fetch class with teacher info
          const classData = await prisma.class.findUnique({
            where: { id: nr.reference_id },
            include: {
              Teacher: {
                select: {
                  id: true,
                  nome: true,
                },
              },
            },
          });

          if (!classData || !classData.final_report) {
            return null;
          }

          return {
            id: nr.id,
            type: 'final_report',
            referenceId: nr.reference_id,
            createdAt: nr.criado_em,
            class: {
              id: classData.id,
              grupo_repense: classData.grupo_repense,
              horario: classData.horario,
            },
            teacher: classData.Teacher ? {
              id: classData.Teacher.id,
              nome: classData.Teacher.nome,
            } : null,
            preview: classData.final_report.substring(0, 100) + (classData.final_report.length > 100 ? '...' : ''),
            fullText: classData.final_report,
          };
        }

        return null;
      })
    );

    // Filter out nulls and sort by createdAt (most recent first)
    const validNotifications = notifications
      .filter((n): n is NonNullable<typeof n> => n !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      notifications: validNotifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);

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
