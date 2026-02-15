import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get capacity status for visual indicators at 70%, 80%, 90%, 100% thresholds
 */
function getCapacityStatus(
  enrollmentCount: number,
  capacidade: number
): 'ok' | 'warning_70' | 'warning_80' | 'warning_90' | 'full' {
  if (capacidade <= 0) return 'ok';
  const percentage = (enrollmentCount / capacidade) * 100;
  if (percentage >= 100) return 'full';
  if (percentage >= 90) return 'warning_90';
  if (percentage >= 80) return 'warning_80';
  if (percentage >= 70) return 'warning_70';
  return 'ok';
}

/**
 * Get day of week order for sorting
 * Starts with Monday (1) through Sunday (7)
 */
function getDayOrder(horario: string | null): number {
  if (!horario) return 8; // Put null horarios at the end
  
  const dayMap: Record<string, number> = {
    'segunda': 1, 'seg': 1,
    'terça': 2, 'ter': 2,
    'quarta': 3, 'qua': 3,
    'quinta': 4, 'qui': 4,
    'sexta': 5, 'sex': 5,
    'sábado': 6, 'sabado': 6, 'sab': 6,
    'domingo': 7, 'dom': 7,
  };

  const lowerHorario = horario.toLowerCase();
  for (const [day, order] of Object.entries(dayMap)) {
    if (lowerHorario.includes(day)) {
      return order;
    }
  }
  
  return 8; // Unknown day goes to end
}

// ============================================================================
// GET /api/teacher/classes
// ============================================================================

/**
 * Get teacher's assigned classes endpoint
 * 
 * Returns all classes assigned to the authenticated teacher with:
 * - Class details (grupo_repense, horario, modelo, cidade)
 * - Enrollment count
 * - Next session date (if scheduled)
 * - Last session date (if occurred)
 * 
 * Classes are sorted by day of the week.
 * 
 * Requires: Authorization header with valid teacher JWT token
 * 
 * Success response (200):
 * {
 *   "classes": [
 *     {
 *       "id": "class-uuid",
 *       "grupo_repense": "Igreja",
 *       "modelo": "presencial",
 *       "capacidade": 15,
 *       "numero_inscritos": 12,
 *       "eh_ativo": true,
 *       "eh_16h": false,
 *       "eh_mulheres": false,
 *       "cidade": "Itu",
 *       "horario": "Segunda 19h",
 *       "data_inicio": "2024-01-08T00:00:00.000Z",
 *       "link_whatsapp": "https://...",
 *       "numero_sessoes": 8,
 *       "cidade": "Itu",
 *       "enrollmentCount": 12,
 *       "nextSession": {
 *         "id": "session-uuid",
 *         "numero_sessao": 3,
 *         "data_sessao": "2024-01-22T19:00:00.000Z"
 *       },
 *       "lastSession": {
 *         "id": "session-uuid",
 *         "numero_sessao": 2,
 *         "data_sessao": "2024-01-15T19:00:00.000Z"
 *       }
 *     }
 *   ],
 *   "totalClasses": 3,
 *   "activeClasses": 2
 * }
 * 
 * Error responses:
 * - 401: Unauthorized (missing or invalid token)
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify teacher token and extract payload
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;

    const now = new Date();

    // Fetch all classes assigned to this teacher
    const classes = await prisma.class.findMany({
      where: {
        teacher_id: teacherId,
      },
      select: {
        id: true,
        grupo_repense: true,
        modelo: true,
        capacidade: true,
        numero_inscritos: true,
        eh_ativo: true,
        eh_16h: true,
        eh_mulheres: true,
        cidade: true,
        horario: true,
        data_inicio: true,
        link_whatsapp: true,
        numero_sessoes: true,
        // Get enrollment count
        enrollments: {
          where: {
            status: 'ativo',
          },
          select: {
            id: true,
          },
        },
        // Get sessions for next/last calculation
        Session: {
          select: {
            id: true,
            numero_sessao: true,
            data_sessao: true,
          },
          orderBy: {
            data_sessao: 'asc',
          },
        },
      },
    });

    // Process classes to add computed fields
    const processedClasses = classes.map((classItem) => {
      // Calculate next and last sessions
      const sessions = classItem.Session;
      const pastSessions = sessions.filter((s) => s.data_sessao < now);
      const futureSessions = sessions.filter((s) => s.data_sessao >= now);

      const lastSession = pastSessions.length > 0 
        ? pastSessions[pastSessions.length - 1] 
        : null;
      const nextSession = futureSessions.length > 0 
        ? futureSessions[0] 
        : null;

      // Remove raw data and add computed fields
      const { enrollments, Session: _, ...classData } = classItem;

      const enrollmentCount = enrollments.length;
      const capacityPercentage =
        classItem.capacidade > 0
          ? Math.round((enrollmentCount / classItem.capacidade) * 100)
          : 0;
      const capacityStatus = getCapacityStatus(enrollmentCount, classItem.capacidade);

      return {
        ...classData,
        cidade: classItem.cidade || 'Indaiatuba',
        enrollmentCount,
        capacityPercentage,
        capacityStatus,
        nextSession: nextSession
          ? {
              id: nextSession.id,
              numero_sessao: nextSession.numero_sessao,
              data_sessao: nextSession.data_sessao,
            }
          : null,
        lastSession: lastSession
          ? {
              id: lastSession.id,
              numero_sessao: lastSession.numero_sessao,
              data_sessao: lastSession.data_sessao,
            }
          : null,
      };
    });

    // Sort by day of week
    processedClasses.sort((a, b) => {
      return getDayOrder(a.horario) - getDayOrder(b.horario);
    });

    // Calculate totals
    const totalClasses = processedClasses.length;
    const activeClasses = processedClasses.filter((c) => c.eh_ativo).length;

    return NextResponse.json({
      classes: processedClasses,
      totalClasses,
      activeClasses,
    });

  } catch (error) {
    console.error('Error fetching teacher classes:', error);

    // Handle authentication errors
    if (error instanceof Error) {
      if (
        error.message.includes('token') ||
        error.message.includes('authorization') ||
        error.message.includes('expired')
      ) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
