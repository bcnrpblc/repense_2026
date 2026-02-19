import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

// ============================================================================
// POST /api/admin/students/export
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await verifyAdminOrTeacherAdminToken(request);

    const body = await request.json();
    const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds : [];

    if (!studentIds.length) {
      return NextResponse.json(
        { error: 'Nenhum participante selecionado para exportar' },
        { status: 400 }
      );
    }

    const students = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        nome: true,
        cpf: true,
        telefone: true,
        email: true,
        genero: true,
        estado_civil: true,
        nascimento: true,
        cidade_preferencia: true,
        criado_em: true,
        priority_list: true,
        priority_list_course_id: true,
        priority_list_added_at: true,
        enrollments: {
          select: {
            status: true,
            Class: {
              select: {
                grupo_repense: true,
                modelo: true,
                cidade: true,
              },
            },
          },
        },
        Attendance: {
          where: {
            observacao: {
              not: null,
            },
          },
          select: {
            id: true,
            lida_por_admin: true,
          },
        },
      },
    });

    const priorityClassIds = [
      ...new Set(
        students
          .map((s) => s.priority_list_course_id)
          .filter((id): id is string => typeof id === 'string')
      ),
    ];

    const priorityClasses =
      priorityClassIds.length > 0
        ? await prisma.class.findMany({
            where: { id: { in: priorityClassIds } },
            select: { id: true, grupo_repense: true },
          })
        : [];

    const classIdToName = Object.fromEntries(
      priorityClasses.map((c) => [c.id, c.grupo_repense])
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Participantes');

    worksheet.columns = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Gênero', key: 'genero', width: 12 },
      { header: 'Estado civil', key: 'estado_civil', width: 16 },
      { header: 'Data de nascimento', key: 'nascimento', width: 18 },
      { header: 'Cidade preferência', key: 'cidade_preferencia', width: 20 },
      { header: 'Inscrições ativas', key: 'inscricoes_ativas', width: 18 },
      { header: 'Inscrições concluídas', key: 'inscricoes_concluidas', width: 22 },
      { header: 'Total inscrições', key: 'total_inscricoes', width: 18 },
      { header: 'Resumo grupos ativos', key: 'grupos_ativos', width: 40 },
      { header: 'Na lista de prioridade', key: 'priority_list', width: 20 },
      { header: 'Curso prioridade', key: 'priority_course', width: 20 },
      { header: 'Desde (prioridade)', key: 'priority_since', width: 20 },
      { header: 'Observações (total)', key: 'obs_total', width: 20 },
      { header: 'Observações não lidas', key: 'obs_unread', width: 24 },
      { header: 'Criado em', key: 'criado_em', width: 20 },
    ];

    students.forEach((student) => {
      const activeEnrollments = student.enrollments.filter((e) => e.status === 'ativo');
      const completedEnrollments = student.enrollments.filter(
        (e) => e.status === 'concluido'
      );

      const activeSummary = activeEnrollments
        .map((e) => {
          const parts: string[] = [e.Class.grupo_repense, e.Class.modelo];
          if (e.Class.cidade) {
            parts.push(e.Class.cidade);
          }
          return parts.join(' / ');
        })
        .join('; ');

      const totalObservations = student.Attendance.length;
      const unreadObservations = student.Attendance.filter(
        (a) => !a.lida_por_admin
      ).length;

      const nascimento =
        student.nascimento != null
          ? new Date(student.nascimento).toLocaleDateString('pt-BR')
          : '';

      const criadoEm = new Date(student.criado_em).toLocaleString('pt-BR');

      const priorityCourseName = student.priority_list_course_id
        ? classIdToName[student.priority_list_course_id] ?? ''
        : '';

      const prioritySince =
        student.priority_list_added_at != null
          ? new Date(student.priority_list_added_at).toLocaleDateString('pt-BR')
          : '';

      worksheet.addRow({
        nome: student.nome,
        cpf: student.cpf,
        telefone: student.telefone,
        email: student.email ?? '',
        genero: student.genero ?? '',
        estado_civil: student.estado_civil ?? '',
        nascimento,
        cidade_preferencia: student.cidade_preferencia ?? '',
        inscricoes_ativas: activeEnrollments.length,
        inscricoes_concluidas: completedEnrollments.length,
        total_inscricoes: student.enrollments.length,
        grupos_ativos: activeSummary,
        priority_list: student.priority_list ? 'Sim' : 'Não',
        priority_course: priorityCourseName,
        priority_since: prioritySince,
        obs_total: totalObservations,
        obs_unread: unreadObservations,
        criado_em: criadoEm,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="participantes_selecionados.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting students:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro ao exportar participantes' },
      { status: 500 }
    );
  }
}

