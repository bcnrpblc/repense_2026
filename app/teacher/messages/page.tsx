'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Card, Button } from '@/app/components/ui';
import { TeacherConversationModal } from '@/app/components/TeacherConversationModal';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

interface ConversationItem {
  id: string;
  classId: string;
  studentId: string | null;
  class: {
    id: string;
    grupo_repense: string;
    horario: string | null;
  };
  student: { id: string; nome: string } | null;
  lastMessage: {
    id: string;
    body: string;
    criado_em: string;
    sender_type: string;
  } | null;
  messageCount: number;
}

// ============================================================================
// PAGE
// ============================================================================

export default function TeacherMessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');

  const fetchConversations = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/teacher/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao carregar conversas');
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const openThread = (c: ConversationItem) => {
    setSelectedId(c.id);
    const classLabel = `${c.class.grupo_repense} – ${c.class.horario || 'Sem horário'}`;
    setSelectedTitle(c.student ? `${classLabel} – ${c.student.nome}` : `Mensagens: ${classLabel}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mensagens</h1>
      <p className="text-gray-600 mb-6">
        Conversas com o líder sobre seus grupos ou participantes.
      </p>

      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-500">Carregando conversas...</p>
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-gray-500">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="mt-2">Nenhuma conversa ainda</p>
            <p className="text-sm mt-1">
              Quando o líder enviar uma mensagem sobre um de seus grupos, ela aparecerá aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => openThread(c)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {c.class.grupo_repense} – {c.class.horario || 'Sem horário'}
                    {c.student && (
                      <span className="text-gray-500 font-normal"> – {c.student.nome}</span>
                    )}
                  </p>
                  {c.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {c.lastMessage.sender_type === 'admin' ? 'Líder: ' : 'Você: '}
                      {c.lastMessage.body.slice(0, 80)}
                      {c.lastMessage.body.length > 80 ? '...' : ''}
                    </p>
                  )}
                  {c.lastMessage && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.lastMessage.criado_em).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openThread(c); }}>
                    Abrir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TeacherConversationModal
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        conversationId={selectedId}
        title={selectedTitle}
      />
    </div>
  );
}
