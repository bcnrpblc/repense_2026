import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeNameBR } from '@/lib/utils/names';
import { logAuditEvent, getChangedFields, maskPhone } from '@/lib/audit';

// ============================================================================
// GET /api/admin/students/[id]
// ============================================================================

/**
 * Get student details with all enrollments and attendance history
 * Admin only endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    await verifyAdminOrTeacherAdminToken(request);

    const studentId = params.id;

    // Fetch student with all related data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            Class: {
              select: {
                id: true,
                grupo_repense: true,
                modelo: true,
                horario: true,
                eh_ativo: true,
                numero_sessoes: true,
                Teacher: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
                Session: {
                  select: {
                    id: true,
                    numero_sessao: true,
                    data_sessao: true,
                  },
                  orderBy: {
                    numero_sessao: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            criado_em: 'desc',
          },
        },
        Attendance: {
          include: {
            Session: {
              select: {
                id: true,
                numero_sessao: true,
                data_sessao: true,
                class_id: true,
                Class: {
                  select: {
                    grupo_repense: true,
                    modelo: true,
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

    if (!student) {
      return NextResponse.json(
        { error: 'Participante não encontrado' },
        { status: 404 }
      );
    }

    // Separate enrollments by status
    const activeEnrollments = student.enrollments.filter((e) => e.status === 'ativo');
    const completedEnrollments = student.enrollments.filter((e) => e.status === 'concluido');
    const cancelledEnrollments = student.enrollments.filter((e) => e.status === 'cancelado');
    const transferredEnrollments = student.enrollments.filter((e) => e.status === 'transferido');

    // Calculate attendance per enrollment
    const enrollmentsWithAttendance = student.enrollments.map((enrollment) => {
      const classSessionIds = enrollment.Class.Session.map((s) => s.id);
      const attendedSessions = student.Attendance.filter(
        (a) => classSessionIds.includes(a.session_id) && a.presente
      );
      const totalSessions = enrollment.Class.Session.length;
      
      return {
        id: enrollment.id,
        status: enrollment.status,
        criado_em: enrollment.criado_em,
        concluido_em: enrollment.concluido_em,
        cancelado_em: enrollment.cancelado_em,
        transferido_de_class_id: enrollment.transferido_de_class_id,
        class: {
          id: enrollment.Class.id,
          grupo_repense: enrollment.Class.grupo_repense,
          modelo: enrollment.Class.modelo,
          horario: enrollment.Class.horario,
          eh_ativo: enrollment.Class.eh_ativo,
          numero_sessoes: enrollment.Class.numero_sessoes,
          teacher: enrollment.Class.Teacher,
        },
        attendance: {
          attended: attendedSessions.length,
          total: totalSessions,
          percentage: totalSessions > 0 
            ? Math.round((attendedSessions.length / totalSessions) * 100) 
            : 0,
        },
      };
    });

    // Get completed grupos for badges
    const completedGrupos = completedEnrollments.map((e) => e.Class.grupo_repense);
    const badges = {
      Igreja: completedGrupos.includes('Igreja'),
      Espiritualidade: completedGrupos.includes('Espiritualidade'),
      Evangelho: completedGrupos.includes('Evangelho'),
    };

    // Format attendance history
    const attendanceHistory = student.Attendance.map((a) => ({
      id: a.id,
      presente: a.presente,
      observacao: a.observacao,
      criado_em: a.criado_em,
      session: {
        id: a.Session.id,
        numero_sessao: a.Session.numero_sessao,
        data_sessao: a.Session.data_sessao,
        class_id: a.Session.class_id,
        class: {
          grupo_repense: a.Session.Class.grupo_repense,
          modelo: a.Session.Class.modelo,
          horario: a.Session.Class.horario,
        },
      },
    }));

    // Get priority list course info if student is on priority list
    let priorityListCourse = null;
    if (student.priority_list && student.priority_list_course_id) {
      const priorityCourse = await prisma.class.findUnique({
        where: { id: student.priority_list_course_id },
        select: {
          id: true,
          grupo_repense: true,
          horario: true,
          eh_ativo: true,
        },
      });
      priorityListCourse = priorityCourse;
    }

    return NextResponse.json({
      student: {
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
      },
      priorityListCourse,
      badges,
      enrollments: {
        all: enrollmentsWithAttendance,
        active: enrollmentsWithAttendance.filter((e) => e.status === 'ativo'),
        completed: enrollmentsWithAttendance.filter((e) => e.status === 'concluido'),
        cancelled: enrollmentsWithAttendance.filter((e) => e.status === 'cancelado'),
        transferred: enrollmentsWithAttendance.filter((e) => e.status === 'transferido'),
      },
      stats: {
        activeCount: activeEnrollments.length,
        completedCount: completedEnrollments.length,
        cancelledCount: cancelledEnrollments.length,
        transferredCount: transferredEnrollments.length,
        totalCount: student.enrollments.length,
      },
      attendanceHistory,
    });

  } catch (error) {
    console.error('Error fetching student:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/admin/students/[id]
// ============================================================================

/**
 * Update student information
 * Admin only endpoint
 * 
 * Note: CPF cannot be changed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const tokenPayload = await verifyAdminOrTeacherAdminToken(request);

    const studentId = params.id;
    const body = await request.json();

    // Allowed fields to update (CPF is not allowed)
    const { nome, email, telefone, genero, estado_civil, nascimento } = body;

    // Verify student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Participante não encontrado' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    if (!telefone || telefone.trim() === '') {
      return NextResponse.json(
        { error: 'Telefone é obrigatório' },
        { status: 400 }
      );
    }

    // Check for duplicate email (if email is provided and different from current)
    if (email && email !== existingStudent.email) {
      const emailExists = await prisma.student.findFirst({
        where: {
          email,
          id: { not: studentId },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado para outro participante' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate phone (if different from current)
    if (telefone !== existingStudent.telefone) {
      const phoneExists = await prisma.student.findFirst({
        where: {
          telefone,
          id: { not: studentId },
        },
      });

      if (phoneExists) {
        return NextResponse.json(
          { error: 'Este telefone já está cadastrado para outro participante' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: {
      nome: string;
      email?: string | null;
      telefone: string;
      genero?: string | null;
      estado_civil?: string | null;
      nascimento?: Date | null;
    } = {
      nome: normalizeNameBR(nome.trim()),
      telefone: telefone.trim(),
    };

    // Handle optional fields
    if (email !== undefined) {
      updateData.email = email?.trim() || null;
    }
    if (genero !== undefined) {
      updateData.genero = genero || null;
    }
    if (estado_civil !== undefined) {
      updateData.estado_civil = estado_civil || null;
    }
    if (nascimento !== undefined) {
      updateData.nascimento = nascimento ? new Date(nascimento) : null;
    }

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
    });

    // Log audit event
    await logAuditEvent(
      {
        event_type: 'data_student_update',
        actor_id: tokenPayload.adminId,
        actor_type: 'admin',
        target_entity: 'Student',
        target_id: studentId,
        action: 'update',
        metadata: {
          changed_fields: getChangedFields(existingStudent, updatedStudent),
          old_values: {
            nome: existingStudent.nome,
            telefone: maskPhone(existingStudent.telefone),
            email: existingStudent.email ? existingStudent.email.substring(0, 3) + '***' : null,
          },
          new_values: {
            nome: updatedStudent.nome,
            telefone: maskPhone(updatedStudent.telefone),
            email: updatedStudent.email ? updatedStudent.email.substring(0, 3) + '***' : null,
          },
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Participante atualizado com sucesso',
      student: updatedStudent,
    });

  } catch (error) {
    console.error('Error updating student:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
