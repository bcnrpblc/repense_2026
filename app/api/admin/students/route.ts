import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================================================
// GET /api/admin/students
// ============================================================================

/**
 * Get paginated list of students
 * Admin only endpoint
 * 
 * Query params:
 * - search: Search by name, CPF, or email
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin or teacher-admin authentication
    await verifyAdminOrTeacherAdminToken(request);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // 'all', 'enrolled', 'priority'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause: Prisma.StudentWhereInput = {};

    if (search) {
      // Clean search term for CPF search (remove dots and dashes)
      const cleanedSearch = search.replace(/[.\-]/g, '');
      
      whereClause.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: cleanedSearch } },
        { telefone: { contains: cleanedSearch } },
      ];
    }

    // Add filter for priority list or enrolled
    if (filter === 'priority') {
      whereClause.priority_list = true;
    } else if (filter === 'enrolled') {
      // Students with active enrollments (will filter in memory after fetching)
      // We'll handle this after fetching since we need to check enrollments
    }

    // Get total count (will be recalculated after filtering if needed)
    const totalCount = await prisma.student.count({ where: whereClause });

    // Fetch ALL students matching the search (we'll sort and paginate in memory)
    // This ensures students with unread observations appear first across all pages
    const allStudents = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        genero: true,
        estado_civil: true,
        nascimento: true,
        criado_em: true,
        priority_list: true,
        priority_list_course_id: true,
        priority_list_added_at: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            Class: {
              select: {
                grupo_repense: true,
                modelo: true,
                data_inicio: true,
              },
            },
          },
        },
        // Get all attendance records with observations
        Attendance: {
          where: {
            observacao: {
              not: null,
            },
          },
          select: {
            id: true,
            observacao: true,
            lida_por_admin: true,
            lida_em: true,
            criado_em: true,
            presente: true,
            Session: {
              select: {
                numero_sessao: true,
                data_sessao: true,
                class_id: true,
                Class: {
                  select: {
                    grupo_repense: true,
                    horario: true,
                  },
                },
              },
            },
          },
          orderBy: {
            criado_em: 'desc',
          },
        },
      },
    });

    // Transform data to include enrollment counts, badges, and observation data
    const transformedStudents = allStudents.map((student) => {
      const activeEnrollments = student.enrollments.filter((e) => e.status === 'ativo');
      const completedEnrollments = student.enrollments.filter((e) => e.status === 'concluido');
      
      // Get completed grupos for badges (I = Igreja, E = Espiritualidade/Evangelho)
      const completedGrupos = completedEnrollments.map((e) => e.Class.grupo_repense);
      const badges = {
        Igreja: completedGrupos.includes('Igreja'),
        Espiritualidade: completedGrupos.includes('Espiritualidade'),
        Evangelho: completedGrupos.includes('Evangelho'),
      };

      // Calculate observation stats
      const observations = student.Attendance.filter((a) => a.observacao);
      const unreadObservations = observations.filter((a) => !a.lida_por_admin);

      return {
        id: student.id,
        nome: student.nome,
        cpf: student.cpf,
        email: student.email,
        telefone: student.telefone,
        genero: student.genero,
        estado_civil: student.estado_civil,
        nascimento: student.nascimento,
        criado_em: student.criado_em,
        priority_list: student.priority_list,
        priority_list_course_id: student.priority_list_course_id,
        priority_list_added_at: student.priority_list_added_at,
        activeEnrollmentsCount: activeEnrollments.length,
        completedEnrollmentsCount: completedEnrollments.length,
        totalEnrollmentsCount: student.enrollments.length,
        completedBadges: badges,
        activeEnrollments: activeEnrollments.map((e) => ({
          Class: {
            grupo_repense: e.Class.grupo_repense,
            modelo: e.Class.modelo,
            data_inicio: e.Class.data_inicio,
          },
        })),
        // Observation data
        observationCount: observations.length,
        unreadObservationCount: unreadObservations.length,
        hasUnreadObservations: unreadObservations.length > 0,
        observations: observations.map((obs) => ({
          id: obs.id,
          observacao: obs.observacao,
          presente: obs.presente,
          lida_por_admin: obs.lida_por_admin,
          lida_em: obs.lida_em,
          criado_em: obs.criado_em,
          sessao: obs.Session.numero_sessao,
          data_sessao: obs.Session.data_sessao,
          class_id: obs.Session.class_id,
          grupo_repense: obs.Session.Class.grupo_repense,
          horario: obs.Session.Class.horario,
        })),
      };
    });

    // Apply enrolled filter if needed (filter priority list students with active enrollments)
    let filteredStudents = transformedStudents;
    if (filter === 'enrolled') {
      filteredStudents = transformedStudents.filter((s) => s.activeEnrollmentsCount > 0);
    } else if (filter === 'priority') {
      // Already filtered by priority_list = true, but ensure no active enrollments
      filteredStudents = transformedStudents.filter((s) => s.priority_list && s.activeEnrollmentsCount === 0);
    }

    // Sort: unread observations first, then by name
    filteredStudents.sort((a, b) => {
      // First: students with unread observations
      if (a.hasUnreadObservations && !b.hasUnreadObservations) return -1;
      if (!a.hasUnreadObservations && b.hasUnreadObservations) return 1;

      // Then by unread count (more unread first)
      if (a.unreadObservationCount !== b.unreadObservationCount) {
        return b.unreadObservationCount - a.unreadObservationCount;
      }

      // Finally by name
      return a.nome.localeCompare(b.nome);
    });

    // Update total count for filtered results
    const filteredTotalCount = filteredStudents.length;

    // Apply pagination after sorting
    const paginatedStudents = filteredStudents.slice(skip, skip + limit);

    // Batch-fetch priority list class names for students with priority_list_course_id
    const priorityListClassIds = [
      ...new Set(
        paginatedStudents
          .filter((s) => s.priority_list_course_id)
          .map((s) => s.priority_list_course_id!)
      ),
    ];
    const priorityListClasses =
      priorityListClassIds.length > 0
        ? await prisma.class.findMany({
            where: { id: { in: priorityListClassIds } },
            select: { id: true, grupo_repense: true },
          })
        : [];
    const classIdToName = Object.fromEntries(
      priorityListClasses.map((c) => [c.id, c.grupo_repense])
    );

    const studentsWithPriorityCourse = paginatedStudents.map((s) => ({
      ...s,
      priorityListCourseName: s.priority_list_course_id
        ? classIdToName[s.priority_list_course_id] ?? null
        : null,
    }));

    // Calculate pagination info based on filtered results
    const totalPages = Math.ceil(filteredTotalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      students: studentsWithPriorityCourse,
      pagination: {
        page,
        limit,
        totalCount: filteredTotalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });

  } catch (error) {
    console.error('Error fetching students:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
