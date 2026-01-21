import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/classes/[id]/students
// ============================================================================

/**
 * Get all enrolled students for a class
 * Includes observation data from attendance records
 * Students with unread observations are sorted first
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    // Verify class exists
    const classData = await prisma.class.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        grupo_repense: true,
        modelo: true,
        horario: true,
        eh_itu: true,
        capacidade: true,
        numero_inscritos: true,
        eh_ativo: true,
        Teacher: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      );
    }

    // Get enrollments with student info
    const enrollments = await prisma.enrollment.findMany({
      where: { class_id: params.id },
      include: {
        student: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone: true,
            email: true,
            // Get all attendance records for this student in this class
            Attendance: {
              where: {
                Session: {
                  class_id: params.id,
                },
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
                  },
                },
              },
              orderBy: {
                criado_em: 'desc',
              },
            },
          },
        },
      },
    });

    // Transform response and calculate observation stats
    const students = enrollments.map((e) => {
      const observations = e.student.Attendance.filter((a) => a.observacao);
      const unreadObservations = observations.filter((a) => !a.lida_por_admin);

      return {
        enrollmentId: e.id,
        studentId: e.student.id,
        nome: e.student.nome,
        cpf: e.student.cpf,
        telefone: e.student.telefone,
        email: e.student.email,
        status: e.status,
        criado_em: e.criado_em,
        concluido_em: e.concluido_em,
        cancelado_em: e.cancelado_em,
        transferido_de_class_id: e.transferido_de_class_id,
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
        })),
      };
    });

    // Sort: unread observations first, then by status (ativo first), then by name
    students.sort((a, b) => {
      // First: students with unread observations
      if (a.hasUnreadObservations && !b.hasUnreadObservations) return -1;
      if (!a.hasUnreadObservations && b.hasUnreadObservations) return 1;

      // Then by unread count (more unread first)
      if (a.unreadObservationCount !== b.unreadObservationCount) {
        return b.unreadObservationCount - a.unreadObservationCount;
      }

      // Then by status (ativo first)
      const statusOrder: Record<string, number> = { ativo: 0, concluido: 1, cancelado: 2, transferido: 3 };
      const aOrder = statusOrder[a.status] ?? 99;
      const bOrder = statusOrder[b.status] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Finally by name
      return a.nome.localeCompare(b.nome);
    });

    // Count total unread observations for the class
    const totalUnreadObservations = students.reduce(
      (sum, s) => sum + s.unreadObservationCount,
      0
    );

    return NextResponse.json({
      class: classData,
      students,
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === 'ativo').length,
      totalUnreadObservations,
    });

  } catch (error) {
    console.error('Error fetching class students:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
