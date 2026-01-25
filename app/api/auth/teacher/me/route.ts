import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/auth/teacher/me
// ============================================================================

/**
 * Get current teacher information endpoint
 * 
 * Returns the authenticated teacher's profile information including:
 * - Basic profile (id, nome, email, telefone)
 * - Number of assigned classes
 * - Upcoming sessions (next 7 days)
 * 
 * Requires: Authorization header with valid teacher JWT token
 * 
 * Success response (200):
 * {
 *   "teacher": {
 *     "id": "uuid",
 *     "nome": "Facilitador Name",
 *     "email": "facilitador@example.com",
 *     "telefone": "11999999999",
 *     "eh_ativo": true,
 *     "criado_em": "2024-01-01T00:00:00.000Z"
 *   },
 *   "stats": {
 *     "assignedClassesCount": 3,
 *     "activeClassesCount": 2,
 *     "upcomingSessions": [
 *       {
 *         "id": "session-uuid",
 *         "numero_sessao": 1,
 *         "data_sessao": "2024-01-15T19:00:00.000Z",
 *         "class": {
 *           "id": "class-uuid",
 *           "grupo_repense": "Igreja",
 *           "horario": "19:00"
 *         }
 *       }
 *     ]
 *   }
 * }
 * 
 * Error responses:
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Teacher not found
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify teacher token and extract payload
    const tokenPayload = await verifyTeacherToken(request);

    // Fetch teacher from database
    const teacher = await prisma.teacher.findUnique({
      where: { id: tokenPayload.teacherId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        eh_ativo: true,
        criado_em: true,
        // Include assigned classes count
        Class: {
          select: {
            id: true,
            eh_ativo: true,
          },
        },
      },
    });

    // Teacher not found (should not happen if token is valid)
    if (!teacher) {
      return NextResponse.json(
        { error: 'Facilitador não encontrado' },
        { status: 404 }
      );
    }

    // Calculate date range for upcoming sessions (next 7 days)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Fetch upcoming sessions for teacher's classes
    const upcomingSessions = await prisma.session.findMany({
      where: {
        Class: {
          teacher_id: teacher.id,
        },
        data_sessao: {
          gte: now,
          lte: nextWeek,
        },
      },
      select: {
        id: true,
        numero_sessao: true,
        data_sessao: true,
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
            modelo: true,
            cidade: true,
          },
        },
      },
      orderBy: {
        data_sessao: 'asc',
      },
      take: 10, // Limit to 10 upcoming sessions
    });

    // Calculate stats
    const assignedClassesCount = teacher.Class.length;
    const activeClassesCount = teacher.Class.filter((c) => c.eh_ativo).length;

    // Prepare response (exclude password_hash and Class array)
    const { Class: _, ...teacherData } = teacher;

    return NextResponse.json({
      teacher: teacherData,
      stats: {
        assignedClassesCount,
        activeClassesCount,
        upcomingSessions: upcomingSessions.map((session) => ({
          id: session.id,
          numero_sessao: session.numero_sessao,
          data_sessao: session.data_sessao,
          class: {
            id: session.Class.id,
            grupo_repense: session.Class.grupo_repense,
            horario: session.Class.horario,
            modelo: session.Class.modelo,
            cidade: session.Class.cidade || 'Indaiatuba',
          },
        })),
      },
    });

  } catch (error) {
    console.error('Error fetching teacher info:', error);

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
