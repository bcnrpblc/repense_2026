'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  presente: boolean;
  observacao: string | null;
}

interface SessionDetail {
  id: string;
  numero_sessao: number;
  data_sessao: string;
  relatorio: string | null;
  criado_em: string;
  class: {
    id: string;
    grupo_repense: string;
    modelo: string;
    horario: string | null;
    cidade: string;
  };
  attendance: AttendanceRecord[];
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

// ============================================================================
// ICONS
// ============================================================================

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

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// SESSION DETAIL MODAL COMPONENT
// ============================================================================

interface SessionDetailModalProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionDetailModal({ sessionId, onClose }: SessionDetailModalProps) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const token = getAuthToken();
        // For admin, we need to use a different approach or add an admin endpoint
        // For now, we'll try to use the teacher endpoint pattern
        // In production, you might want a dedicated admin session detail endpoint
        
        // Actually, let's create a workaround using existing endpoints
        // The admin can view sessions via the class sessions endpoint
        const response = await fetch(`/api/admin/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSession(data.session);
        } else {
          // Fallback: session data might need to be passed from parent
          console.error('Session fetch failed');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        ></div>
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
              ) : session ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Sessão #{session.numero_sessao}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(session.data_sessao)}
                  </p>
                </>
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalhes da Sessão
                </h3>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-20 bg-gray-100 rounded-lg"></div>
                  <div className="h-20 bg-gray-100 rounded-lg"></div>
                  <div className="h-20 bg-gray-100 rounded-lg"></div>
                </div>
                <div className="h-32 bg-gray-100 rounded-lg"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ) : session ? (
              <>
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
                  <h4 className="font-medium text-gray-900 mb-3">
                    Lista de Presença ({session.attendance.length} participantes)
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
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
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Não foi possível carregar os detalhes da sessão</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
