'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card, Button } from '@/app/components/ui';
import { Modal, ConfirmModal } from '@/app/components/Modal';
import { ConversationModal } from '@/app/components/ConversationModal';
import { TransferStudentModal } from '@/app/components/TransferStudentModal';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ClassInfo {
  id: string;
  grupo_repense: string;
  modelo: string;
  horario: string | null;
  cidade: string | null;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  Teacher: {
    id: string;
    nome: string;
  } | null;
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
}

interface Student {
  enrollmentId: string;
  studentId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string | null;
  status: string;
  criado_em: string;
  concluido_em: string | null;
  cancelado_em: string | null;
  // Observation data
  observationCount: number;
  unreadObservationCount: number;
  hasUnreadObservations: boolean;
  observations: Observation[];
}

interface TransferTarget {
  studentId: string;
  studentName: string;
}

interface ActionTarget {
  type: 'complete' | 'cancel';
  student: Student;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-16" />
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
                    <div className="flex items-center gap-2 mb-2">
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
// CLASS STUDENTS PAGE COMPONENT
// ============================================================================

export default function ClassStudentsPage() {
  const params = useParams();
  const classId = params.id as string;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferTarget, setTransferTarget] = useState<TransferTarget | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [observationStudent, setObservationStudent] = useState<Student | null>(null);
  const [totalUnreadObservations, setTotalUnreadObservations] = useState(0);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [conversationStudentId, setConversationStudentId] = useState<string | null>(null);
  const [conversationStudentName, setConversationStudentName] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch class and students data
  const fetchData = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      setClassInfo(data.class);
      setStudents(data.students);
      setTotalUnreadObservations(data.totalUnreadObservations || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId]);

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
    await fetchData();

    // Update the modal student if still open
    if (observationStudent) {
      const updatedStudent = students.find((s) => s.studentId === observationStudent.studentId);
      if (updatedStudent) {
        setObservationStudent(updatedStudent);
      }
    }
  };

  // Handle enrollment completion
  const handleComplete = async () => {
    if (!actionTarget || actionTarget.type !== 'complete') return;

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/enrollments/${actionTarget.student.enrollmentId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao concluir inscrição');
      }

      toast.success(`${actionTarget.student.nome} concluído com sucesso!`);
      setActionTarget(null);
      fetchData();
    } catch (error) {
      console.error('Error completing enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir inscrição');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle enrollment cancellation
  const handleCancel = async () => {
    if (!actionTarget || actionTarget.type !== 'cancel') return;

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/enrollments/${actionTarget.student.enrollmentId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao cancelar inscrição');
      }

      toast.success(`Inscrição de ${actionTarget.student.nome} cancelada!`);
      setActionTarget(null);
      fetchData();
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar inscrição');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  if (loading) {
    return (
      <div>
        <Link
          href="/admin/classes"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Grupos
        </Link>
        <div className="animate-pulse bg-white rounded-xl p-6 mb-6 border border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <StudentsSkeleton />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Grupo não encontrada</p>
        <Link href="/admin/classes" className="mt-4 text-blue-600 hover:underline">
          Voltar para Grupos
        </Link>
      </div>
    );
  }

  const activeStudents = students.filter((s) => s.status === 'ativo');
  const completedStudents = students.filter((s) => s.status === 'concluido');
  const cancelledStudents = students.filter((s) => s.status === 'cancelado');

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/admin/classes"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para Grupos
      </Link>

      {/* Class Info Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {classInfo.grupo_repense}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                classInfo.modelo === 'presencial'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {classInfo.modelo}
              </span>
              {!classInfo.eh_ativo && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Inativa
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {classInfo.horario || 'Horário não definido'}
            </h1>
            <p className="text-sm text-gray-600">
              {classInfo.Teacher?.nome || 'Sem facilitador'} • {classInfo.cidade || 'Indaiatuba'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {classInfo.numero_inscritos}/{classInfo.capacidade}
            </p>
            <p className="text-sm text-gray-500">vagas ocupadas</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{activeStudents.length}</p>
          <p className="text-xs text-gray-500">Ativos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{completedStudents.length}</p>
          <p className="text-xs text-gray-500">Concluídos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-gray-400">{cancelledStudents.length}</p>
          <p className="text-xs text-gray-500">Cancelados</p>
        </Card>
        <Card className={`text-center ${totalUnreadObservations > 0 ? 'ring-2 ring-red-200 bg-red-50' : ''}`}>
          <p className={`text-2xl font-bold ${totalUnreadObservations > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {totalUnreadObservations}
          </p>
          <p className="text-xs text-gray-500">Obs. não lidas</p>
        </Card>
      </div>

      {/* Filter and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Participantes ({filteredStudents.length})
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filtrar:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos ({students.length})</option>
            <option value="ativo">Ativos ({activeStudents.length})</option>
            <option value="concluido">Concluídos ({completedStudents.length})</option>
            <option value="cancelado">Cancelados ({cancelledStudents.length})</option>
          </select>
        </div>
      </div>

      {/* Students Table / List */}
      {filteredStudents.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-gray-500">
            {filterStatus === 'all' 
              ? 'Nenhum participante inscrito neste grupo' 
              : `Nenhum participante com status "${filterStatus}"`}
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
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  const statusBadge = getStatusBadge(student.status);
                  return (
                    <tr 
                      key={student.enrollmentId} 
                      className={`hover:bg-gray-50 ${student.hasUnreadObservations ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <Link 
                              href={`/admin/students/${student.studentId}`}
                              className="font-medium text-gray-900 hover:text-blue-600"
                            >
                              {student.nome}
                            </Link>
                            {student.email && (
                              <p className="text-xs text-gray-500">{student.email}</p>
                            )}
                          </div>
                          <ObservationBadge
                            count={student.observationCount}
                            hasUnread={student.hasUnreadObservations}
                            onClick={() => setObservationStudent(student)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                        {formatCPF(student.cpf)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.telefone}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <p>{formatDate(student.criado_em)}</p>
                        {student.concluido_em && (
                          <p className="text-xs text-blue-500">
                            Concluído: {formatDate(student.concluido_em)}
                          </p>
                        )}
                        {student.cancelado_em && (
                          <p className="text-xs text-gray-400">
                            Cancelado: {formatDate(student.cancelado_em)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {student.status === 'ativo' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setActionTarget({ type: 'complete', student })}
                              className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
                              title="Marcar como concluído"
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => setActionTarget({ type: 'cancel', student })}
                              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
                              title="Cancelar inscrição"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => setTransferTarget({
                                studentId: student.studentId,
                                studentName: student.nome,
                              })}
                              className="px-3 py-1 text-xs font-medium text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-50"
                              title="Transferir para outro Grupo"
                            >
                              Mover
                            </button>
                            {classInfo?.Teacher && (
                              <button
                                onClick={() => {
                                  setConversationStudentId(student.studentId);
                                  setConversationStudentName(student.nome);
                                  setShowConversationModal(true);
                                }}
                                className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                                title="Enviar mensagem sobre este participante"
                              >
                                Mensagem
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredStudents.map((student) => {
              const statusBadge = getStatusBadge(student.status);
              return (
                <Card 
                  key={student.enrollmentId}
                  className={student.hasUnreadObservations ? 'ring-2 ring-red-200' : ''}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/students/${student.studentId}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {student.nome}
                      </Link>
                      <ObservationBadge
                        count={student.observationCount}
                        hasUnread={student.hasUnreadObservations}
                        onClick={() => setObservationStudent(student)}
                      />
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 font-mono mb-1">
                    {formatCPF(student.cpf)}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">{student.telefone}</p>
                  {student.email && (
                    <p className="text-sm text-gray-500 mb-3">{student.email}</p>
                  )}
                  
                  <p className="text-xs text-gray-400 mb-3">
                    Inscrito em: {formatDate(student.criado_em)}
                    {student.concluido_em && ` • Concluído: ${formatDate(student.concluido_em)}`}
                    {student.cancelado_em && ` • Cancelado: ${formatDate(student.cancelado_em)}`}
                  </p>

                  {student.status === 'ativo' && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => setActionTarget({ type: 'complete', student })}
                        className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => setActionTarget({ type: 'cancel', student })}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setTransferTarget({
                          studentId: student.studentId,
                          studentName: student.nome,
                        })}
                        className="flex-1 px-3 py-2 text-sm font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50"
                      >
                        Mover
                      </button>
                      {classInfo?.Teacher && (
                        <button
                          onClick={() => {
                            setConversationStudentId(student.studentId);
                            setConversationStudentName(student.nome);
                            setShowConversationModal(true);
                          }}
                          className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                        >
                          Mensagem
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
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

      {/* Transfer Modal */}
      {transferTarget && classInfo && (
        <TransferStudentModal
          isOpen={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          onSuccess={fetchData}
          studentId={transferTarget.studentId}
          studentName={transferTarget.studentName}
          currentClassId={classId}
          currentGrupoRepense={classInfo.grupo_repense}
          isPriorityListStudent={false}
        />
      )}

      {/* Confirm Action Modal */}
      {actionTarget && (
        <ConfirmModal
          isOpen={!!actionTarget}
          onClose={() => setActionTarget(null)}
          onConfirm={actionTarget.type === 'complete' ? handleComplete : handleCancel}
          title={actionTarget.type === 'complete' ? 'Concluir Inscrição' : 'Cancelar Inscrição'}
          message={
            actionTarget.type === 'complete'
              ? `Deseja marcar ${actionTarget.student.nome} como concluído em ${classInfo?.grupo_repense} - ${classInfo?.horario || 'Horário não definido'}?`
              : `Deseja cancelar a inscrição de ${actionTarget.student.nome}? Esta ação liberará 1 vaga no Grupo.`
          }
          confirmText={actionTarget.type === 'complete' ? 'Concluir' : 'Cancelar Inscrição'}
          variant={actionTarget.type === 'complete' ? 'info' : 'danger'}
          loading={actionLoading}
        />
      )}

      {/* Conversation with facilitator (about class or about participant) */}
      {classInfo && (
        <ConversationModal
          isOpen={showConversationModal}
          onClose={() => {
            setShowConversationModal(false);
            setConversationStudentId(null);
            setConversationStudentName(null);
          }}
          classId={classId}
          studentId={conversationStudentId}
          studentName={conversationStudentName}
          classLabel={`${classInfo.grupo_repense} – ${classInfo.horario || 'Sem horário'}`}
        />
      )}
    </div>
  );
}
