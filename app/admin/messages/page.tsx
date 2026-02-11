'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Card, Button } from '@/app/components/ui';
import { ConversationModal } from '@/app/components/ConversationModal';
import { getAuthToken } from '@/lib/hooks/useAuth';

interface ConversationItem {
  id: string;
  classId: string;
  studentId: string | null;
  class: {
    id: string;
    grupo_repense: string;
    horario: string | null;
    Teacher: { id: string; nome: string; email: string } | null;
  };
  student: { id: string; nome: string } | null;
  teacher: { id: string; nome: string; email: string } | null;
  lastMessage: {
    id: string;
    body: string;
    criado_em: string;
    sender_type: string;
  } | null;
  messageCount: number;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedClassLabel, setSelectedClassLabel] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/conversations', {
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

  const openConversation = (c: ConversationItem) => {
    const classLabel = `${c.class.grupo_repense} – ${c.class.horario || 'Sem horário'}`;
    setSelectedClassLabel(classLabel);
    setSelectedStudentName(c.student?.nome ?? null);
    setSelectedConversationId(c.id);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mensagens</h1>
      <p className="text-gray-600 mb-6">
        Todas as conversas com facilitadores por grupo ou participante.
      </p>

      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-500">Carregando conversas...</p>
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-gray-500">
            <p className="mt-2">Nenhuma conversa ainda</p>
            <p className="text-sm mt-1">
              As conversas aparecem quando você envia mensagens a partir de um grupo ou participante.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => openConversation(c)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {c.class.grupo_repense} – {c.class.horario || 'Sem horário'}
                    {c.student && (
                      <span className="text-gray-500 font-normal"> – {c.student.nome}</span>
                    )}
                  </p>
                  {c.teacher && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Facilitador: {c.teacher.nome}
                    </p>
                  )}
                  {c.lastMessage && (
                    <>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {c.lastMessage.sender_type === 'admin' ? 'Líder: ' : 'Facilitador: '}
                        {c.lastMessage.body.slice(0, 80)}
                        {c.lastMessage.body.length > 80 ? '...' : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(c.lastMessage.criado_em).toLocaleString('pt-BR')}
                      </p>
                    </>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openConversation(c);
                  }}
                >
                  Abrir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConversationModal
        isOpen={!!selectedConversationId}
        onClose={() => {
          setSelectedConversationId(null);
          setSelectedClassLabel('');
          setSelectedStudentName(null);
        }}
        classId=""
        studentId={null}
        studentName={selectedStudentName}
        classLabel={selectedClassLabel}
        initialConversationId={selectedConversationId}
      />
    </div>
  );
}
