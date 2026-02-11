'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/app/components/Modal';
import { Button } from '@/app/components/ui';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  body: string;
  sender_type: string;
  sender_admin_id?: string | null;
  sender_teacher_id?: string | null;
  criado_em: string;
  Admin?: { id: string; email: string } | null;
  Teacher?: { id: string; nome: string; email: string } | null;
}

interface TeacherConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  title: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TeacherConversationModal({
  isOpen,
  onClose,
  conversationId,
  title,
}: TeacherConversationModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/auth/teacher/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data?.teacher?.id && setCurrentTeacherId(data.teacher.id))
      .catch(() => {});
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const res = await fetch(`/api/teacher/conversations/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erro ao carregar mensagens');
        }
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar mensagens');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages().then(() => {
      const token = getAuthToken();
      if (token && conversationId) {
        fetch('/api/teacher/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: 'leader_message', referenceId: conversationId }),
        }).catch(() => {});
      }
    });
  }, [isOpen, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !conversationId || sending) return;

    setSending(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/teacher/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
      setMessages((prev) => [...prev, data.message]);
      setBody('');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      {!conversationId ? (
        <div className="py-8 text-center text-gray-500">Conversa não disponível.</div>
      ) : loading ? (
        <div className="py-8 text-center text-gray-500">Carregando mensagens...</div>
      ) : (
        <>
          <div className="flex flex-col min-h-[320px] max-h-[60vh]">
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Nenhuma mensagem ainda. Envie a primeira.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        msg.sender_type === 'teacher'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className="text-xs opacity-80 mt-1">
                        {msg.sender_type === 'teacher'
                          ? (msg.sender_teacher_id && msg.sender_teacher_id === currentTeacherId
                              ? 'Você'
                              : msg.Teacher?.nome ?? 'Facilitador')
                          : msg.Admin?.email ?? 'Líder'}
                        {' · '}
                        {new Date(msg.criado_em).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                disabled={sending}
                maxLength={5000}
              />
              <Button type="submit" variant="primary" loading={sending} disabled={!body.trim()}>
                Enviar
              </Button>
            </form>
          </div>
        </>
      )}
    </Modal>
  );
}
