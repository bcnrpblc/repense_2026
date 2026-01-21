'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card, Button } from '@/app/components/ui';
import { ConfirmModal } from '@/app/components/Modal';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ClassData {
  id: string;
  grupo_repense: string;
  modelo: string;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  eh_16h: boolean;
  eh_mulheres: boolean;
  eh_itu: boolean;
  horario: string | null;
  data_inicio: string | null;
  numero_sessoes: number;
  link_whatsapp: string | null;
  arquivada: boolean;
  atualizado_em: string;
  final_report: string | null;
  final_report_em: string | null;
  Teacher: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
  } | null;
  _count: {
    enrollments: number;
    Session: number;
  };
}

interface SessionSummary {
  id: string;
  numero_sessao: number;
  data_sessao: string;
  relatorio: string | null;
  criado_em: string;
  isActive: boolean;
  attendance: {
    presentes: number;
    total: number;
    percentual: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR');
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
// CLASS DETAIL PAGE COMPONENT
// ============================================================================

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Fetch class data
  const fetchClass = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Turma não encontrada');
          router.push('/admin/classes');
          return;
        }
        throw new Error('Failed to fetch class');
      }

      const data = await response.json();
      setClassData(data.class);
    } catch (error) {
      console.error('Error fetching class:', error);
      toast.error('Erro ao carregar turma');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sessions data (for Sessões tab)
  const fetchSessions = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Não bloqueia a página se falhar, apenas loga/mostra toast
        const data = await response.json().catch(() => ({}));
        console.error('Error fetching class sessions:', data.error || response.statusText);
        return;
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching class sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchClass();
    fetchSessions();
  }, [classId]);

  // Toggle active status
  const toggleStatus = async () => {
    if (!classData) return;
    
    setToggling(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eh_ativo: !classData.eh_ativo }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao atualizar turma');
      }

      toast.success(classData.eh_ativo ? 'Turma desativada' : 'Turma ativada');
      fetchClass();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar turma');
    } finally {
      setToggling(false);
    }
  };

  // Archive class
  const archiveClass = async () => {
    setArchiving(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classId}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao arquivar turma');
      }

      toast.success(result.message);
      setShowArchiveModal(false);
      fetchClass();
    } catch (error) {
      console.error('Error archiving class:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao arquivar turma');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando turma...</p>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

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
        Voltar para Turmas
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGrupoBadgeColor(classData.grupo_repense)}`}>
              {classData.grupo_repense}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              classData.modelo === 'presencial'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {classData.modelo}
            </span>
            {classData.arquivada && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-600">
                Arquivada
              </span>
            )}
            {!classData.arquivada && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                classData.eh_ativo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {classData.eh_ativo ? 'Ativa' : 'Inativa'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {classData.horario || 'Horário não definido'}
          </h1>
          <p className="text-gray-500">
            {classData.eh_itu ? 'Itu' : 'Indaiatuba'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!classData.arquivada && (
            <>
              <Button
                variant="secondary"
                onClick={toggleStatus}
                loading={toggling}
              >
                {classData.eh_ativo ? 'Desativar' : 'Ativar'}
              </Button>
              <Link href={`/admin/classes/${classId}/edit`}>
                <Button variant="primary">Editar</Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  // Check if final report is required but missing
                  if (classData._count.Session >= classData.numero_sessoes && !classData.final_report) {
                    toast.error('Relatório final é obrigatório para arquivar uma turma que completou todas as sessões');
                    return;
                  }
                  setShowArchiveModal(true);
                }}
              >
                Arquivar
              </Button>
            </>
          )}
          {classData.arquivada && (
            <Button
              variant="primary"
              onClick={archiveClass}
              loading={archiving}
            >
              Desarquivar
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Class Info */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Turma</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Data de Início</dt>
              <dd className="font-medium text-gray-900">{formatDate(classData.data_inicio)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Número de Sessões</dt>
              <dd className="font-medium text-gray-900">{classData.numero_sessoes}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sessões Realizadas</dt>
              <dd className="font-medium text-gray-900">{classData._count.Session}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Capacidade</dt>
              <dd className="font-medium text-gray-900">
                {classData.numero_inscritos}/{classData.capacidade}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Somente Mulheres</dt>
              <dd className="font-medium text-gray-900">{classData.eh_mulheres ? 'Sim' : 'Não'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Aula da Tarde</dt>
              <dd className="font-medium text-gray-900">{classData.eh_16h ? 'Sim' : 'Não'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Atualizado em</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(classData.atualizado_em)}</dd>
            </div>
          </dl>

          {classData.link_whatsapp && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a
                href={classData.link_whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-green-600 hover:text-green-700"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Grupo do WhatsApp
              </a>
            </div>
          )}
        </Card>

        {/* Líder Info */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Líder</h2>
          {classData.Teacher ? (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-medium">
                  {classData.Teacher.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-lg">{classData.Teacher.nome}</p>
                  <p className="text-gray-500">{classData.Teacher.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="font-medium text-gray-900">{classData.Teacher.telefone}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <p className="mt-2 text-gray-500 italic">Esperando em Deus</p>
              <p className="text-sm text-gray-400">Nenhum líder atribuído</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/classes/${classId}/students`}>
            <Button variant="secondary">
              Ver Alunos ({classData._count.enrollments})
            </Button>
          </Link>
          <Link href={`/admin/classes/${classId}/edit`}>
            <Button variant="secondary">
              Editar Turma
            </Button>
          </Link>
        </div>
      </Card>

      {/* Final Report Section */}
      {classData._count.Session >= classData.numero_sessoes && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Relatório Final da Turma
          </h2>
          {classData.final_report ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                {classData.final_report}
              </p>
              {classData.final_report_em && (
                <p className="text-xs text-gray-500">
                  Enviado em {new Date(classData.final_report_em).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Relatório final não enviado. A turma não pode ser arquivada até que o relatório final seja enviado.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Sessions List */}
      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sessões</h2>
          <p className="text-sm text-gray-500">
            {classData._count.Session} sessão(ões) cadastrada(s)
          </p>
        </div>

        {sessionsLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Carregando sessões...
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Nenhuma sessão registrada para esta turma
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl border border-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Sessão
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Presença
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Relatório
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => {
                  const isExpanded = expandedSessionId === session.id;
                  const relatorioText = session.relatorio || '';
                  const truncated =
                    relatorioText.length > 120
                      ? relatorioText.slice(0, 120) + '...'
                      : relatorioText;

                  return (
                    <tr key={session.id} className="align-top">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">
                          Sessão {session.numero_sessao}
                        </div>
                        {session.isActive && (
                          <span className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            Em andamento
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>{new Date(session.data_sessao).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-gray-400">
                          Criada em {formatDateTime(session.criado_em)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium">
                          {session.attendance.presentes}/{session.attendance.total}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.attendance.percentual}% presentes
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                        {relatorioText ? (
                          <>
                            <p className="whitespace-pre-wrap">
                              {isExpanded ? relatorioText : truncated}
                            </p>
                            {relatorioText.length > 120 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSessionId(isExpanded ? null : session.id)
                                }
                                className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? 'Ver menos' : 'Ver mais'}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Nenhum relatório registrado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={archiveClass}
        title="Arquivar Turma"
        message={`Deseja arquivar a turma ${classData.grupo_repense} - ${classData.horario || 'Sem horário'}? Turmas arquivadas não aparecem na listagem principal.`}
        confirmText="Arquivar"
        variant="warning"
        loading={archiving}
      />
    </div>
  );
}
