import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/analytics/overview
// ============================================================================

/**
 * Get analytics overview data for admin dashboard
 * 
 * Returns:
 * - Enrollments by grupo_repense
 * - Enrollments by city (Itu vs Indaiatuba)
 * - Enrollments by status
 * - Total sessions conducted
 * - Average attendance rate
 * - Classes by capacity utilization
 * - Sessions per week (last 8 weeks)
 * 
 * Response:
 * - 200: Analytics data
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    // Fetch all data in parallel for better performance
    const [
      classes,
      enrollments,
      sessions,
      attendanceRecords,
    ] = await Promise.all([
      prisma.class.findMany({
        select: {
          id: true,
          grupo_repense: true,
          eh_itu: true,
          capacidade: true,
          numero_inscritos: true,
          eh_ativo: true,
          horario: true,
          data_inicio: true,
          _count: {
            select: {
              enrollments: { where: { status: 'ativo' } },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        select: {
          id: true,
          status: true,
          criado_em: true,
          Class: {
            select: {
              grupo_repense: true,
              eh_itu: true,
              data_inicio: true,
            },
          },
        },
      }),
      prisma.session.findMany({
        where: {
          relatorio: { not: null }, // Only completed sessions
        },
        select: {
          id: true,
          data_sessao: true,
          class_id: true,
        },
      }),
      prisma.attendance.findMany({
        select: {
          presente: true,
        },
      }),
    ]);

    // =========================================================================
    // Calculate enrollments by grupo_repense
    // =========================================================================
    const enrollmentsByGrupo = {
      Igreja: enrollments.filter((e) => e.Class.grupo_repense === 'Igreja').length,
      Espiritualidade: enrollments.filter((e) => e.Class.grupo_repense === 'Espiritualidade').length,
      Evangelho: enrollments.filter((e) => e.Class.grupo_repense === 'Evangelho').length,
    };

    // =========================================================================
    // Calculate enrollments by city
    // =========================================================================
    const enrollmentsByCity = {
      Itu: enrollments.filter((e) => e.Class.eh_itu).length,
      Indaiatuba: enrollments.filter((e) => !e.Class.eh_itu).length,
    };

    // =========================================================================
    // Calculate enrollments by status
    // =========================================================================
    const statusCounts: Record<string, number> = {};
    enrollments.forEach((e) => {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    });
    const enrollmentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // =========================================================================
    // Calculate total sessions and average attendance
    // =========================================================================
    const totalSessions = sessions.length;
    const totalAttendanceRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.presente).length;
    const averageAttendance = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0;

    // =========================================================================
    // Calculate capacity utilization by class
    // =========================================================================
    const capacityUtilization = classes
      .filter((c) => c.eh_ativo)
      .map((c) => ({
        id: c.id,
        horario: c.horario || 'Sem horário',
        grupo_repense: c.grupo_repense,
        capacidade: c.capacidade,
        inscritos: c._count.enrollments,
        utilizacao: Math.round((c._count.enrollments / c.capacidade) * 100),
      }))
      .sort((a, b) => b.utilizacao - a.utilizacao)
      .slice(0, 10); // Top 10

    // =========================================================================
    // Calculate sessions per week (last 8 weeks)
    // =========================================================================
    const now = new Date();
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks = 56 days

    const sessionsPerWeek: { week: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const count = sessions.filter((s) => {
        const sessionDate = new Date(s.data_sessao);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      }).length;

      // Format week label (e.g., "06/01 - 12/01")
      const weekLabel = `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`;

      sessionsPerWeek.push({
        week: weekLabel,
        count,
      });
    }

    // =========================================================================
    // Summary stats + novos indicadores
    // =========================================================================
    const activeClasses = classes.filter((c) => c.eh_ativo).length;
    const totalStudents = enrollments.filter((e) => e.status === 'ativo').length;

    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Matrículas em grupos aguardando inicio
    const futureEnrollmentsCount = enrollments.filter((e) => {
      if (e.status !== 'ativo') return false;
      const start = e.Class.data_inicio;
      return start !== null && start > now;
    }).length;

    // Matrículas criadas no ano (todas, independente do status)
    const yearToDateEnrollments = enrollments.filter((e) => {
      const created = e.criado_em;
      return created >= startOfYear && created <= now;
    }).length;

    // Taxa de drop-off (canceladas sobre total)
    const totalEnrollmentsAllTime = enrollments.length;
    const cancelledAllTime = enrollments.filter((e) => e.status === 'cancelado').length;
    const dropOffRate = totalEnrollmentsAllTime > 0
      ? Math.round((cancelledAllTime / totalEnrollmentsAllTime) * 100)
      : 0;

    // Taxa de drop-off no ano (opcional, baseada em criadas no ano)
    const yearEnrollments = enrollments.filter((e) => {
      const created = e.criado_em;
      return created >= startOfYear && created <= now;
    });
    const cancelledYear = yearEnrollments.filter((e) => e.status === 'cancelado').length;
    const yearToDateDropOffRate = yearEnrollments.length > 0
      ? Math.round((cancelledYear / yearEnrollments.length) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        totalActiveClasses: activeClasses,
        totalActiveStudents: totalStudents,
        totalSessionsConducted: totalSessions,
        averageAttendanceRate: averageAttendance,
        futureEnrollments: futureEnrollmentsCount,
        yearToDateEnrollments,
        dropOffRate,
        yearToDateDropOffRate,
      },
      enrollmentsByGrupo,
      enrollmentsByCity,
      enrollmentsByStatus,
      capacityUtilization,
      sessionsPerWeek,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);

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
