'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card, Button } from '@/app/components/ui';
import { ConfirmModal } from '@/app/components/Modal';
import { EditStudentModal } from '@/app/components/EditStudentModal';
import { TransferStudentModal } from '@/app/components/TransferStudentModal';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StudentInfo {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string;
  genero: string | null;
  estado_civil: string | null;
  nascimento: string | null;
  criado_em: string;
  priority_list?: boolean;
  priority_list_course_id?: string | null;
  priority_list_added_at?: string | null;
}

interface PriorityListCourse {
  id: string;
  grupo_repense: string;
  horario: string | null;
  eh_itu: boolean;
  eh_ativo: boolean;
}

interface TeacherInfo {
  id: string;
  nome: string;
}

interface ClassInfo {
  id: string;
  grupo_repense: string;
  modelo: string;
  horario: string | null;
  eh_itu: boolean;
  eh_ativo: boolean;
  numero_sessoes: number;
  teacher: TeacherInfo | null;
}

interface AttendanceStats {
  attended: number;
  total: number;
  percentage: number;
}

interface Enrollment {
  id: string;
  status: string;
  criado_em: string;
  concluido_em: string | null;
  cancelado_em: string | null;
  transferido_de_class_id: string | null;
  class: ClassInfo;
  attendance: AttendanceStats;
}

interface AttendanceRecord {
  id: string;
  presente: boolean;
  observacao: string | null;
  criado_em: string;
  session: {
    id: string;
    numero_sessao: number;
    data_sessao: string;
    class_id: string;
    class: {
      grupo_repense: string;
      modelo: string;
      horario: string | null;
    };
  };
}

interface Badges {
  Igreja: boolean;
  Espiritualidade: boolean;
  Evangelho: boolean;
}

interface StudentStats {
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  transferredCount: number;
  totalCount: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR');
}

function getStatusBadge(status: string): { color: string; label: string } {
  switch (status) {
    case 'ativo':
      return { color: 'bg-green-100 text-green-800', label: 'Ativo' };
    case 'concluido':
      return { color: 'bg-blue-100 text-blue-800', label: 'Concluído' };
    case 'cancelado':
      return { color: 'bg-gray-100 text-gray-600', label: 'Cancelado' };
    case 'transferido':
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Transferido' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: status };
  }
}

function getBadgeColor(grupo: string): string {
  switch (grupo) {
    case 'Igreja':
      return 'bg-purple-100 text-purple-800';
    case 'Espiritualidade':
      return 'bg-indigo-100 text-indigo-800';
    case 'Evangelho':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-full mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

// ============================================================================
// STUDENT PROFILE PAGE COMPONENT
// ============================================================================

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [badges, setBadges] = useState<Badges>({ Igreja: false, Espiritualidade: false, Evangelho: false });
  const [enrollments, setEnrollments] = useState<{
    all: Enrollment[];
    active: Enrollment[];
    completed: Enrollment[];
    cancelled: Enrollment[];
    transferred: Enrollment[];
  }>({ all: [], active: [], completed: [], cancelled: [], transferred: [] });
  const [stats, setStats] = useState<StudentStats>({
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    transferredCount: 0,
    totalCount: 0,
  });
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'attendance'>('active');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'cancel';
    enrollment: Enrollment;
  } | null>(null);
  const [transferTarget, setTransferTarget] = useState<{
    studentId: string;
    studentName: string;
    currentClassId?: string;
    grupoRepense?: string;
    isPriorityListStudent?: boolean;
  } | null>(null);
  const [priorityListCourse, setPriorityListCourse] = useState<PriorityListCourse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch student data
  const fetchStudent = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student');
      }

      const data = await response.json();
      setStudent(data.student);
      setBadges(data.badges);
      setEnrollments(data.enrollments);
      setStats(data.stats);
      setAttendanceHistory(data.attendanceHistory);
      setPriorityListCourse(data.priorityListCourse || null);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  // Handle enrollment completion
  const handleComplete = async () => {
    if (!confirmAction || confirmAction.type !== 'complete') return;

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/enrollments/${confirmAction.enrollment.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao concluir inscrição');
      }

      toast.success('Inscrição concluída com sucesso!');
      setConfirmAction(null);
      fetchStudent();
    } catch (error) {
      console.error('Error completing enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir inscrição');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle enrollment cancellation
  const handleCancel = async () => {
    if (!confirmAction || confirmAction.type !== 'cancel') return;

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/enrollments/${confirmAction.enrollment.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao cancelar inscrição');
      }

      toast.success('Inscrição cancelada com sucesso!');
      setConfirmAction(null);
      fetchStudent();
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar inscrição');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Alunos
        </Link>
        <ProfileSkeleton />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Aluno não encontrado</p>
        <Link href="/admin/students" className="mt-4 text-blue-600 hover:underline">
          Voltar para Alunos
        </Link>
      </div>
    );
  }

  // Calculate overall attendance rate across all enrollments
  const overallAttendance = (() => {
    const all = enrollments.all;
    if (!all || all.length === 0) {
      return { attended: 0, total: 0, percentage: 0 };
    }
    const attended = all.reduce(
      (sum, e) => sum + (e.attendance?.attended ?? 0),
      0
    );
    const total = all.reduce(
      (sum, e) => sum + (e.attendance?.total ?? 0),
      0
    );
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { attended, total, percentage };
  })();

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/admin/students"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para Alunos
      </Link>

      {/* Student Info Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-medium">
              {student.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{student.nome}</h1>
              <p className="text-sm text-gray-500 font-mono">{formatCPF(student.cpf)}</p>
              <div className="flex gap-1 mt-2">
                {(['Igreja', 'Espiritualidade', 'Evangelho'] as const).map((grupo) => (
                  <span
                    key={grupo}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      badges[grupo] ? getBadgeColor(grupo) : 'bg-gray-100 text-gray-400'
                    }`}
                    title={badges[grupo] ? `${grupo} concluído` : `${grupo} não concluído`}
                  >
                    {grupo}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase">Email</p>
            <p className="text-sm font-medium text-gray-900">{student.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Telefone</p>
            <p className="text-sm font-medium text-gray-900">{student.telefone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Gênero</p>
            <p className="text-sm font-medium text-gray-900">{student.genero || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Estado Civil</p>
            <p className="text-sm font-medium text-gray-900">{student.estado_civil || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Nascimento</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(student.nascimento)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Cadastrado em</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(student.criado_em)}</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <p className="text-2xl font-bold text-green-600">{stats.activeCount}</p>
          <p className="text-sm text-gray-500">Ativas</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-blue-600">{stats.completedCount}</p>
          <p className="text-sm text-gray-500">Concluídas</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-gray-400">{stats.cancelledCount}</p>
          <p className="text-sm text-gray-500">Canceladas</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-yellow-600">{stats.transferredCount}</p>
          <p className="text-sm text-gray-500">Transferidas</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-indigo-600">
            {overallAttendance.percentage}%
          </p>
          <p className="text-sm text-gray-500">
            Presença geral ({overallAttendance.attended}/{overallAttendance.total})
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Inscrições Atuais ({stats.activeCount})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Histórico ({stats.totalCount})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'attendance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Frequência ({attendanceHistory.length})
          </button>
        </nav>
      </div>

      {/* Tab Content: Active Enrollments */}
      {activeTab === 'active' && (
        <>
          {/* Priority List Student Section */}
          {student?.priority_list && (
            <Card className="mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Lista de Prioridade
                    </span>
                    {priorityListCourse && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(priorityListCourse.grupo_repense)}`}>
                        {priorityListCourse.grupo_repense}
                      </span>
                    )}
                  </div>
                  {priorityListCourse ? (
                    <>
                      <p className="font-medium text-gray-900">
                        {priorityListCourse.grupo_repense}
                      </p>
                      {student.priority_list_added_at && (
                        <p className="text-sm text-gray-500 mt-1">
                          Adicionado em: {formatDate(student.priority_list_added_at)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">Curso não definido</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTransferTarget({
                      studentId: student.id,
                      studentName: student.nome,
                      isPriorityListStudent: true,
                    })}
                  >
                    Transferir
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {enrollments.active.length === 0 && !student?.priority_list ? (
            <Card className="py-8 text-center">
              <p className="text-gray-500">Nenhuma inscrição ativa</p>
            </Card>
          ) : enrollments.active.length > 0 ? (
            <div className="space-y-4">
              {enrollments.active.map((enrollment) => (
                <Card key={enrollment.id}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(enrollment.class.grupo_repense)}`}>
                          {enrollment.class.grupo_repense}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          enrollment.class.modelo === 'presencial'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {enrollment.class.modelo}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {enrollment.class.horario || 'Horário não definido'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {enrollment.class.teacher?.nome || 'Sem líder'} • {enrollment.class.eh_itu ? 'Itu' : 'Indaiatuba'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Inscrito em: {formatDate(enrollment.criado_em)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {enrollment.attendance.attended}/{enrollment.attendance.total}
                        </p>
                        <p className="text-xs text-gray-500">presenças</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'complete', enrollment })}
                        >
                          Concluir
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'cancel', enrollment })}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setTransferTarget({
                            studentId: student.id,
                            studentName: student.nome,
                            currentClassId: enrollment.class.id,
                            grupoRepense: enrollment.class.grupo_repense,
                            isPriorityListStudent: false,
                          })}
                        >
                          Transferir
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* Tab Content: History */}
      {activeTab === 'history' && (
        <>
          {enrollments.all.length === 0 ? (
            <Card className="py-8 text-center">
              <p className="text-gray-500">Nenhuma inscrição encontrada</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Turma
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Líder
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Presenças
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.all.map((enrollment) => {
                    const statusBadge = getStatusBadge(enrollment.status);
                    return (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(enrollment.class.grupo_repense)}`}>
                              {enrollment.class.grupo_repense}
                            </span>
                            <span className="text-sm text-gray-600">
                              {enrollment.class.modelo}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mt-1">
                            {enrollment.class.horario || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {enrollment.class.teacher?.nome || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {enrollment.attendance.attended}/{enrollment.attendance.total}
                          <span className="text-gray-400 ml-1">
                            ({enrollment.attendance.percentage}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <p>{formatDate(enrollment.criado_em)}</p>
                          {enrollment.concluido_em && (
                            <p className="text-xs text-gray-400">
                              Concluído: {formatDate(enrollment.concluido_em)}
                            </p>
                          )}
                          {enrollment.cancelado_em && (
                            <p className="text-xs text-gray-400">
                              Cancelado: {formatDate(enrollment.cancelado_em)}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab Content: Attendance */}
      {activeTab === 'attendance' && (
        <>
          {attendanceHistory.length === 0 ? (
            <Card className="py-8 text-center">
              <p className="text-gray-500">Nenhuma frequência registrada</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Turma
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Sessão
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Presença
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Observação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(record.session.data_sessao)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(record.session.class.grupo_repense)}`}>
                          {record.session.class.grupo_repense}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          {record.session.class.horario || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        Sessão {record.session.numero_sessao}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.presente ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {record.observacao || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Edit Student Modal */}
      {student && (
        <EditStudentModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchStudent}
          student={student}
        />
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmAction.type === 'complete' ? handleComplete : handleCancel}
          title={confirmAction.type === 'complete' ? 'Concluir Inscrição' : 'Cancelar Inscrição'}
          message={
            confirmAction.type === 'complete'
              ? `Deseja marcar ${student.nome} como concluído em ${confirmAction.enrollment.class.grupo_repense} - ${confirmAction.enrollment.class.horario || 'Horário não definido'}?`
              : `Deseja cancelar a inscrição de ${student.nome}? Esta ação liberará 1 vaga na turma.`
          }
          confirmText={confirmAction.type === 'complete' ? 'Concluir' : 'Cancelar Inscrição'}
          variant={confirmAction.type === 'complete' ? 'info' : 'danger'}
          loading={actionLoading}
        />
      )}

      {/* Transfer Modal */}
      {transferTarget && (
        <TransferStudentModal
          isOpen={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          onSuccess={fetchStudent}
          studentId={transferTarget.studentId}
          studentName={transferTarget.studentName}
          currentClassId={transferTarget.currentClassId}
          currentGrupoRepense={transferTarget.grupoRepense}
          isPriorityListStudent={transferTarget.isPriorityListStudent || false}
        />
      )}
    </div>
  );
}
