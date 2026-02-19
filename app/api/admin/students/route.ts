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

    // Demographic filters
    const birthFromParam = searchParams.get('birthFrom');
    const birthToParam = searchParams.get('birthTo');
    const ageRangeParam = searchParams.get('ageRange'); // e.g. '18-25', '26-35', '36-50', '50+'

    // Enrollment-based filters
    const enrollmentStatus = searchParams.get('enrollmentStatus'); // 'any' | 'active' | 'completed_only'
    const hasEnrollment = searchParams.get('hasEnrollment'); // 'any' | 'with' | 'without'
    const grupoFilter = searchParams.get('grupo'); // 'Igreja' | 'Espiritualidade' | 'Evangelho'
    const modeloFilter = searchParams.get('modelo'); // 'online' | 'presencial'
    const classCityFilter = searchParams.get('classCity'); // e.g. 'Itu', 'Indaiatuba'
    const womenOnlyFilter = searchParams.get('womenOnly'); // 'any' | 'only' | 'exclude'
    const is16hFilter = searchParams.get('is16h'); // 'any' | 'only' | 'exclude'

    // Observation filters
    const hasUnreadObservationsParam = searchParams.get('hasUnreadObservations'); // 'true' | 'false'

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
                cidade: true,
                eh_mulheres: true,
                eh_16h: true,
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

    // Compute birth date range from explicit params and/or age range
    let birthFrom: Date | null = null;
    let birthTo: Date | null = null;

    const today = new Date();

    if (ageRangeParam) {
      const [minStr, maxStr] = ageRangeParam.split('-');
      const minAge = parseInt(minStr, 10);
      const maxAge = maxStr === '+' ? Number.POSITIVE_INFINITY : parseInt(maxStr, 10);

      if (!Number.isNaN(minAge)) {
        // Birth date upper bound: youngest in range (minAge)
        const upper = new Date(today);
        upper.setFullYear(upper.getFullYear() - minAge);

        // Birth date lower bound: oldest in range (maxAge)
        let lower: Date | null = null;
        if (Number.isFinite(maxAge)) {
          lower = new Date(today);
          lower.setFullYear(lower.getFullYear() - maxAge);
        }

        birthTo = upper;
        if (lower) {
          birthFrom = lower;
        }
      }
    }

    if (birthFromParam) {
      const parsed = new Date(birthFromParam);
      if (!Number.isNaN(parsed.getTime())) {
        birthFrom = parsed;
      }
    }

    if (birthToParam) {
      const parsed = new Date(birthToParam);
      if (!Number.isNaN(parsed.getTime())) {
        birthTo = parsed;
      }
    }

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
            cidade: e.Class.cidade,
            eh_mulheres: e.Class.eh_mulheres,
            eh_16h: e.Class.eh_16h,
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

    // Apply high-level filter if needed (priority vs enrolled)
    let filteredStudents = transformedStudents;
    if (filter === 'enrolled') {
      filteredStudents = filteredStudents.filter((s) => s.activeEnrollmentsCount > 0);
    } else if (filter === 'priority') {
      // Already filtered by priority_list = true, but ensure no active enrollments
      filteredStudents = filteredStudents.filter((s) => s.priority_list && s.activeEnrollmentsCount === 0);
    }

    // Apply demographic filters (birth date / age)
    if (birthFrom || birthTo) {
      filteredStudents = filteredStudents.filter((s) => {
        if (!s.nascimento) return false;
        const birthDate = new Date(s.nascimento);
        if (birthFrom && birthDate < birthFrom) return false;
        if (birthTo && birthDate > birthTo) return false;
        return true;
      });
    }

    // Apply enrollment-based filters
    if (enrollmentStatus && enrollmentStatus !== 'any') {
      filteredStudents = filteredStudents.filter((s) => {
        const hasActive = s.activeEnrollmentsCount > 0;
        const hasNonActive = s.totalEnrollmentsCount > s.activeEnrollmentsCount;

        if (enrollmentStatus === 'active') {
          return hasActive;
        }
        if (enrollmentStatus === 'completed_only') {
          return !hasActive && hasNonActive;
        }
        return true;
      });
    }

    if (hasEnrollment && hasEnrollment !== 'any') {
      filteredStudents = filteredStudents.filter((s) => {
        if (hasEnrollment === 'with') {
          return s.totalEnrollmentsCount > 0;
        }
        if (hasEnrollment === 'without') {
          return s.totalEnrollmentsCount === 0;
        }
        return true;
      });
    }

    if (grupoFilter) {
      filteredStudents = filteredStudents.filter((s) =>
        s.activeEnrollments?.some((e) => e.Class.grupo_repense === grupoFilter)
      );
    }

    if (modeloFilter) {
      filteredStudents = filteredStudents.filter((s) =>
        s.activeEnrollments?.some((e) => e.Class.modelo === modeloFilter)
      );
    }

    if (classCityFilter) {
      filteredStudents = filteredStudents.filter((s) =>
        s.activeEnrollments?.some((e) => e.Class.cidade === classCityFilter)
      );
    }

    if (womenOnlyFilter && womenOnlyFilter !== 'any') {
      filteredStudents = filteredStudents.filter((s) => {
        const hasWomenOnly = s.activeEnrollments?.some((e) => e.Class.eh_mulheres) ?? false;
        if (womenOnlyFilter === 'only') {
          return hasWomenOnly;
        }
        if (womenOnlyFilter === 'exclude') {
          return !hasWomenOnly;
        }
        return true;
      });
    }

    if (is16hFilter && is16hFilter !== 'any') {
      filteredStudents = filteredStudents.filter((s) => {
        const has16h = s.activeEnrollments?.some((e) => e.Class.eh_16h) ?? false;
        if (is16hFilter === 'only') {
          return has16h;
        }
        if (is16hFilter === 'exclude') {
          return !has16h;
        }
        return true;
      });
    }

    // Apply observation filters
    if (hasUnreadObservationsParam === 'true') {
      filteredStudents = filteredStudents.filter((s) => s.hasUnreadObservations);
    } else if (hasUnreadObservationsParam === 'false') {
      filteredStudents = filteredStudents.filter((s) => !s.hasUnreadObservations);
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
