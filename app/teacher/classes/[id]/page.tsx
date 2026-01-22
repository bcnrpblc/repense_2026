'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, Button } from '@/app/components/ui';
import toast from 'react-hot-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ClassSession {
  id: string;
  numero_sessao: number;
  data_sessao: string;
  relatorio: string | null;
  attendance: {
    presentes: number;
    total: number;
    percentual: number;
  };
}

interface ClassDetails {
  id: string;
  grupo_repense: string;
  modelo: string;
  horario: string | null;
  cidade: string;
  capacidade: number;
  numero_inscritos: number;
  numero_sessoes: number;
  eh_ativo: boolean;
  eh_mulheres: boolean;
  eh_16h: boolean;
}

interface SessionDetail {
  id: string;
  numero_sessao: number;
  data_sessao: string;
  relatorio: string | null;
  attendance: {
    studentId: string;
    studentName: string;
    presente: boolean;
    observacao: string | null;
  }[];
  stats: {
    total: number;
    presentes: number;
    ausentes: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getGrupoBadgeColor(grupo: string): string {
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
// ICONS
// ============================================================================

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

// ============================================================================
// LOADING SKELETON
// ============================================================================

function SessionsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
            <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SESSION DETAIL MODAL COMPONENT
// ============================================================================

interface SessionDetailModalProps {
  session: SessionDetail;
  classInfo: ClassDetails;
  onClose: () => void;
}

function SessionDetailModal({ session, classInfo, onClose }: SessionDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sessão #{session.numero_sessao}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(session.data_sessao)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{session.stats.presentes}</p>
                <p className="text-sm text-green-700">Presentes</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{session.stats.ausentes}</p>
                <p className="text-sm text-red-700">Ausentes</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {session.stats.total > 0 
                    ? Math.round((session.stats.presentes / session.stats.total) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-blue-700">Taxa</p>
              </div>
            </div>

            {/* Report */}
            {session.relatorio && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Relatório da Aula</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {session.relatorio}
                </div>
              </div>
            )}

            {/* Attendance List */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Lista de Presença</h4>
              <div className="space-y-2">
                {session.attendance.map((record) => (
                  <div 
                    key={record.studentId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      record.presente ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {record.presente ? <CheckCircleIcon /> : <XCircleIcon />}
                      <span className="font-medium text-gray-900">{record.studentName}</span>
                    </div>
                    {record.observacao && (
                      <span className="text-sm text-gray-500 italic">{record.observacao}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CLASS DETAIL PAGE
// ============================================================================

export default function TeacherClassDetailPage() {
  const params = useParams();
  const classId = params.id as string;
  const { token } = useAuth({ requiredRole: 'teacher' });

  const [classInfo, setClassInfo] = useState<ClassDetails | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [finalReport, setFinalReport] = useState('');
  const [finalReportEm, setFinalReportEm] = useState<string | null>(null);
  const [submittingFinalReport, setSubmittingFinalReport] = useState(false);
  const [showFinalReportModal, setShowFinalReportModal] = useState(false);

  // Fetch class and sessions data
  useEffect(() => {
    async function fetchData() {
      if (!token) return;

      try {
        // Fetch class info from teacher classes endpoint
        const classesResponse = await fetch('/api/teacher/classes', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!classesResponse.ok) throw new Error('Failed to fetch classes');

        const classesData = await classesResponse.json();
        const classItem = classesData.classes.find((c: any) => c.id === classId);

        if (!classItem) {
          throw new Error('Class not found');
        }

        setClassInfo({
          id: classItem.id,
          grupo_repense: classItem.grupo_repense,
          modelo: classItem.modelo,
          horario: classItem.horario,
          cidade: classItem.cidade,
          capacidade: classItem.capacidade,
          numero_inscritos: classItem.enrollmentCount,
          numero_sessoes: classItem.numero_sessoes,
          eh_ativo: classItem.eh_ativo,
          eh_mulheres: classItem.eh_mulheres,
          eh_16h: classItem.eh_16h,
        });

        // Fetch session history
        const sessionsResponse = await fetch(`/api/teacher/classes/${classId}/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setSessions(sessionsData.sessions || []);
        } else {
          console.error('Failed to fetch sessions');
          setSessions([]);
        }

        // Fetch final report if exists
        const finalReportResponse = await fetch(`/api/teacher/classes/${classId}/final-report`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (finalReportResponse.ok) {
          const finalReportData = await finalReportResponse.json();
          setFinalReport(finalReportData.final_report || '');
          setFinalReportEm(finalReportData.final_report_em || null);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token, classId]);

  // Fetch session detail when selected
  const handleViewSession = async (sessionId: string) => {
    if (!token) return;

    setLoadingDetail(true);
    setSelectedSessionId(sessionId);

    try {
      const response = await fetch(`/api/teacher/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch session');

      const data = await response.json();
      setSessionDetail(data.session);
    } catch (error) {
      console.error('Error fetching session detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit final report
  const handleSubmitFinalReport = async () => {
    if (!token || !finalReport.trim()) return;

    setSubmittingFinalReport(true);
    try {
      const response = await fetch(`/api/teacher/classes/${classId}/final-report`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ final_report: finalReport.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar relatório final');
        return;
      }

      toast.success('Relatório final salvo com sucesso!');
      setFinalReportEm(new Date().toISOString());
      setShowFinalReportModal(false);
    } catch (error) {
      console.error('Error submitting final report:', error);
      toast.error('Erro ao salvar relatório final');
    } finally {
      setSubmittingFinalReport(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="animate-pulse mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
        <SessionsSkeleton />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Grupo não encontrado</p>
        <Link href="/teacher/classes" className="mt-4 text-blue-600 hover:underline">
          Voltar para Grupos
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeftIcon />
        Voltar para Grupos
      </Link>

      {/* Class Info Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGrupoBadgeColor(classInfo.grupo_repense)}`}>
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
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {classInfo.horario || 'Horário não definido'}
            </h1>
            <p className="text-gray-600">{classInfo.cidade}</p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {classInfo.numero_inscritos}/{classInfo.capacidade}
              </p>
              <p className="text-sm text-gray-500">participantes</p>
            </div>
            {classInfo.eh_ativo && (
              <Link href={`/teacher/classes/${classId}/session`}>
                <Button variant="primary" size="sm">
                  Iniciar Nova Sessão
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Sessions History */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Histórico de Sessões
        </h2>
        <p className="text-sm text-gray-500">
          {sessions.length} de {classInfo.numero_sessoes} sessões
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="text-center py-12">
          <ClockIcon />
          <p className="text-gray-500 mt-4">Nenhuma sessão realizada ainda</p>
          {classInfo.eh_ativo && (
            <Link href={`/teacher/classes/${classId}/session`}>
              <Button variant="primary" size="sm" className="mt-4">
                Iniciar Primeira Sessão
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card 
              key={session.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewSession(session.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Sessão #{session.numero_sessao}
                    </h3>
                    {session.relatorio ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Concluída
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        Em andamento
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatShortDate(session.data_sessao)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {session.attendance.presentes}/{session.attendance.total}
                  </p>
                  <p className="text-sm text-gray-500">
                    {session.attendance.percentual}% presentes
                  </p>
                </div>
              </div>

              {session.relatorio && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {session.relatorio}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Final Report Section - Show when class has completed all sessions */}
      {classInfo && sessions.length >= classInfo.numero_sessoes && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Relatório Final do Grupo
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {finalReportEm 
                  ? `Enviado em ${new Date(finalReportEm).toLocaleDateString('pt-BR')}`
                  : 'Obrigatório para arquivar o grupo'}
              </p>
            </div>
            {!finalReport && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowFinalReportModal(true)}
              >
                Enviar Relatório Final
              </Button>
            )}
          </div>
          {finalReport ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{finalReport}</p>
              {finalReportEm && (
                <p className="text-xs text-gray-500 mt-2">
                  Enviado em {new Date(finalReportEm).toLocaleString('pt-BR')}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setShowFinalReportModal(true)}
              >
                Editar Relatório Final
              </Button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Este grupo completou todas as sessões. É necessário enviar um relatório final antes de arquivar o grupo.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Final Report Modal */}
      {showFinalReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowFinalReportModal(false)}></div>
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Relatório Final do Grupo
                  </h3>
                  <p className="text-sm text-gray-500">
                    Este relatório é obrigatório para arquivar o grupo
                  </p>
                </div>
                <button
                  onClick={() => setShowFinalReportModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <textarea
                  value={finalReport}
                  onChange={(e) => setFinalReport(e.target.value)}
                  placeholder="Descreva o resumo final do grupo, conquistas, observações importantes, etc..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={10}
                  style={{ minHeight: '250px' }}
                />
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowFinalReportModal(false)}
                  disabled={submittingFinalReport}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmitFinalReport}
                  disabled={submittingFinalReport || !finalReport.trim()}
                >
                  {submittingFinalReport ? 'Salvando...' : 'Salvar Relatório Final'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSessionId && sessionDetail && classInfo && (
        <SessionDetailModal
          session={sessionDetail}
          classInfo={classInfo}
          onClose={() => {
            setSelectedSessionId(null);
            setSessionDetail(null);
          }}
        />
      )}
    </div>
  );
}
