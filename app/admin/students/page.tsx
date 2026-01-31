'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, Button } from '@/app/components/ui';
import { Modal } from '@/app/components/Modal';
import { getAuthToken } from '@/lib/hooks/useAuth';
import { formatClassDisplay } from '@/lib/date-formatters';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CompletedBadges {
  Igreja: boolean;
  Espiritualidade: boolean;
  Evangelho: boolean;
}

interface Observation {
  id: string;
  observacao: string;
  presente: boolean;
  lida_por_admin: boolean;
  lida_em: string | null;
  criado_em: string;
  sessao: number;
  data_sessao: string;
  class_id: string;
  grupo_repense: string;
  horario: string | null;
}

interface ActiveEnrollmentClass {
  grupo_repense: string;
  modelo: string;
  data_inicio: string | null;
}

interface Student {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string;
  genero: string | null;
  estado_civil: string | null;
  nascimento: string | null;
  criado_em: string;
  priority_list: boolean;
  priority_list_course_id: string | null;
  priority_list_added_at: string | null;
  priorityListCourseName?: string | null;
  activeEnrollmentsCount: number;
  activeEnrollments?: { Class: ActiveEnrollmentClass }[];
  completedEnrollmentsCount: number;
  totalEnrollmentsCount: number;
  completedBadges: CompletedBadges;
  // Observation data
  observationCount: number;
  unreadObservationCount: number;
  hasUnreadObservations: boolean;
  observations: Observation[];
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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

function getBadgeAbbreviation(grupo: string): string {
  switch (grupo) {
    case 'Igreja':
      return 'IGR';
    case 'Espiritualidade':
      return 'ESP';
    case 'Evangelho':
      return 'EVG';
    default:
      return '?';
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR');
}

// ============================================================================
// ICONS
// ============================================================================

const BellIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

function StudentsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// OBSERVATION BADGE COMPONENT
// ============================================================================

interface ObservationBadgeProps {
  count: number;
  hasUnread: boolean;
  onClick: () => void;
}

function ObservationBadge({ count, hasUnread, onClick }: ObservationBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`relative inline-flex items-center justify-center p-1.5 rounded-full transition-colors ${
        hasUnread
          ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
      title={`${count} observação(ões)${hasUnread ? ' (não lida)' : ''}`}
    >
      <BellIcon />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// OBSERVATIONS MODAL COMPONENT
// ============================================================================

interface ObservationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onMarkRead: (ids: string[]) => Promise<void>;
}

function ObservationsModal({ isOpen, onClose, student, onMarkRead }: ObservationsModalProps) {
  const [markingRead, setMarkingRead] = useState(false);

  const handleMarkAllRead = async () => {
    const unreadIds = student.observations
      .filter((o) => !o.lida_por_admin)
      .map((o) => o.id);

    if (unreadIds.length === 0) return;

    setMarkingRead(true);
    try {
      await onMarkRead(unreadIds);
      toast.success('Observações marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar como lidas');
    } finally {
      setMarkingRead(false);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    setMarkingRead(true);
    try {
      await onMarkRead([id]);
    } catch (error) {
      toast.error('Erro ao marcar como lida');
    } finally {
      setMarkingRead(false);
    }
  };

  const unreadCount = student.observations.filter((o) => !o.lida_por_admin).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Observações - ${student.nome}`} size="lg">
      <div className="space-y-4">
        {/* Header with mark all button */}
        {unreadCount > 0 && (
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-red-600">{unreadCount}</span> observação(ões) não lida(s)
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingRead}
            >
              {markingRead ? 'Marcando...' : 'Marcar todas como lidas'}
            </Button>
          </div>
        )}

        {/* Observations list */}
        {student.observations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nenhuma observação registrada para este participante
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {student.observations.map((obs) => (
              <div
                key={obs.id}
                className={`p-4 rounded-lg border ${
                  obs.lida_por_admin
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Session info */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-500">
                        {obs.grupo_repense}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {obs.horario || 'Horário não definido'}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-medium text-gray-500">
                        Encontro {obs.sessao}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(obs.data_sessao)}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className={`text-xs font-medium ${obs.presente ? 'text-green-600' : 'text-red-600'}`}>
                        {obs.presente ? 'Presente' : 'Ausente'}
                      </span>
                    </div>

                    {/* Observation text */}
                    <p className="text-sm text-gray-700">{obs.observacao}</p>

                    {/* Timestamps */}
                    <div className="mt-2 text-xs text-gray-400">
                      <span>Criado em {formatDateTime(obs.criado_em)}</span>
                      {obs.lida_por_admin && obs.lida_em && (
                        <span className="ml-2">• Lido em {formatDateTime(obs.lida_em)}</span>
                      )}
                    </div>
                  </div>

                  {/* Mark as read button */}
                  {!obs.lida_por_admin && (
                    <button
                      onClick={() => handleMarkOneRead(obs.id)}
                      disabled={markingRead}
                      className="flex-shrink-0 p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Marcar como lida"
                    >
                      <CheckIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}

// ============================================================================
// STUDENTS PAGE COMPONENT
// ============================================================================

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [observationStudent, setObservationStudent] = useState<Student | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch students
  const fetchStudents = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (filter !== 'all') {
        params.set('filter', filter);
      }

      const response = await fetch(`/api/admin/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }

      const data = await response.json();
      setStudents(data.students);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  // Fetch on mount and when search or filter changes
  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents, filter]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchStudents(newPage);
  };

  // Navigate to student profile
  const handleRowClick = (studentId: string) => {
    router.push(`/admin/students/${studentId}`);
  };

  // Handle marking observations as read
  const handleMarkObservationsRead = async (ids: string[]) => {
    const token = getAuthToken();
    const response = await fetch('/api/admin/observations/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ observationIds: ids }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark as read');
    }

    // Refresh data
    await fetchStudents(pagination.page);

    // Update the modal student if still open
    if (observationStudent) {
      const updatedStudent = students.find((s) => s.id === observationStudent.id);
      if (updatedStudent) {
        setObservationStudent(updatedStudent);
      }
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Participantes</h1>
          <p className="mt-1 text-gray-600">
            Gerencie os participantes do sistema
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Participante
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CPF ou email..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtro
            </label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos</option>
              <option value="enrolled">Matriculados</option>
              <option value="priority">Lista de Prioridade</option>
            </select>
          </div>
          {pagination.totalCount > 0 && (
            <div className="flex items-end">
              <p className="text-sm text-gray-500">
                {pagination.totalCount} participante{pagination.totalCount !== 1 ? 's' : ''} encontrado{pagination.totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Students List */}
      {loading ? (
        <StudentsSkeleton />
      ) : students.length === 0 ? (
        <Card className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <p className="mt-4 text-gray-500">
            {search ? 'Nenhum participante encontrado com esses critérios' : 'Nenhum participante cadastrado'}
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    CPF
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Email/Telefone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    PG Repense Concluídos
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Inscrições Ativas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 cursor-pointer ${student.hasUnreadObservations ? 'bg-red-50/50' : ''}`}
                    onClick={() => handleRowClick(student.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {student.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <div>
                            <p className={`font-medium ${student.hasUnreadObservations ? 'text-red-600' : 'text-gray-900'}`}>
                              {student.nome}
                            </p>
                            {student.activeEnrollmentsCount > 0 && student.activeEnrollments && student.activeEnrollments.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {student.activeEnrollments.map((e, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getBadgeColor(e.Class.grupo_repense)}`}
                                  >
                                    {e.Class.grupo_repense}: {formatClassDisplay(e.Class.modelo, e.Class.data_inicio)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {student.priority_list && student.activeEnrollmentsCount === 0 && (
                              <div className="mt-1 text-xs text-gray-600">
                                Aguardando vaga em: {student.priorityListCourseName ?? 'Lista de Prioridade'}
                                {student.priority_list_added_at && (
                                  <span className="text-gray-500 ml-1">
                                    (desde {formatDate(student.priority_list_added_at)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {student.priority_list && student.activeEnrollmentsCount === 0 && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Lista de Prioridade
                            </span>
                          )}
                          <ObservationBadge
                            count={student.observationCount}
                            hasUnread={student.hasUnreadObservations}
                            onClick={() => setObservationStudent(student)}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {formatCPF(student.cpf)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{student.email || '-'}</p>
                      <p className="text-xs text-gray-500">{student.telefone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {(['Igreja', 'Espiritualidade', 'Evangelho'] as const).map((grupo) => (
                          <span
                            key={grupo}
                            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                              student.completedBadges[grupo]
                                ? getBadgeColor(grupo)
                                : 'bg-gray-100 text-gray-400'
                            }`}
                            title={student.completedBadges[grupo] ? `${grupo} concluído` : `${grupo} não concluído`}
                          >
                            {getBadgeAbbreviation(grupo)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        student.activeEnrollmentsCount > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {student.activeEnrollmentsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 border border-primary/20 rounded-lg hover:bg-primary/5"
                        >
                          Ver Perfil
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {students.map((student) => (
              <Card
                key={student.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${student.hasUnreadObservations ? 'ring-2 ring-red-200' : ''}`}
                onClick={() => handleRowClick(student.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {student.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${student.hasUnreadObservations ? 'text-red-600' : 'text-gray-900'}`}>
                            {student.nome}
                          </p>
                          {student.priority_list && student.activeEnrollmentsCount === 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Lista de Prioridade
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{formatCPF(student.cpf)}</p>
                      </div>
                      <ObservationBadge
                        count={student.observationCount}
                        hasUnread={student.hasUnreadObservations}
                        onClick={() => setObservationStudent(student)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(['Igreja', 'Espiritualidade', 'Evangelho'] as const).map((grupo) => (
                      <span
                        key={grupo}
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          student.completedBadges[grupo]
                            ? getBadgeColor(grupo)
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {getBadgeAbbreviation(grupo)}
                      </span>
                    ))}
                  </div>
                </div>

                {student.activeEnrollmentsCount > 0 && student.activeEnrollments && student.activeEnrollments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {student.activeEnrollments.map((e, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getBadgeColor(e.Class.grupo_repense)}`}
                      >
                        {e.Class.grupo_repense}: {formatClassDisplay(e.Class.modelo, e.Class.data_inicio)}
                      </span>
                    ))}
                  </div>
                )}

                {student.priority_list && student.activeEnrollmentsCount === 0 && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 text-gray-600 text-sm">
                    Aguardando vaga em: {student.priorityListCourseName ?? 'Lista de Prioridade'}
                    {student.priority_list_added_at && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Desde: {formatDate(student.priority_list_added_at)}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="text-gray-900 truncate">{student.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Telefone</p>
                    <p className="text-gray-900">{student.telefone}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500">
                      <span className="font-medium text-green-600">{student.activeEnrollmentsCount}</span> ativa{student.activeEnrollmentsCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-500">
                      <span className="font-medium text-blue-600">{student.completedEnrollmentsCount}</span> concluída{student.completedEnrollmentsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Observations Modal */}
      {observationStudent && (
        <ObservationsModal
          isOpen={!!observationStudent}
          onClose={() => setObservationStudent(null)}
          student={observationStudent}
          onMarkRead={handleMarkObservationsRead}
        />
      )}
    </div>
  );
}
