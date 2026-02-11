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

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId?: string;
  studentId?: string | null;
  studentName?: string | null;
  classLabel?: string;
  /** When opening from admin messages list, pass conversation id and labels */
  initialConversationId?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConversationModal({
  isOpen,
  onClose,
  classId = '',
  studentId = null,
  studentName = null,
  classLabel = 'Grupo',
  initialConversationId = null,
}: ConversationModalProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/auth/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data?.admin?.id && setCurrentAdminId(data.admin.id))
      .catch(() => {});
  }, [isOpen]);

  const title = studentName
    ? `Mensagens: ${classLabel} – ${studentName}`
    : `Falar com facilitador: ${classLabel}`;

  const effectiveConversationId = initialConversationId || conversationId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialConversationId) {
      setConversationId(initialConversationId);
      setLoading(false);
      return;
    }
    setConversationId(null);
    if (!classId) return;

    setLoading(true);
    const token = getAuthToken();
    const qs = studentId != null && studentId !== '' ? `?studentId=${studentId}` : '?studentId=';
    fetch(`/api/admin/classes/${classId}/conversations${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Erro ao carregar conversa'); });
        return res.json();
      })
      .then((data) => {
        const conv = data.conversation;
        if (!conv?.id) throw new Error('Conversa não encontrada');
        setConversationId(conv.id);
      })
      .catch((e) => {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar conversa');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [isOpen, classId, studentId, initialConversationId, onClose]);

  useEffect(() => {
    const id = initialConversationId || conversationId;
    if (!id || !isOpen) return;

    const fetchMessages = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(`/api/admin/conversations/${id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erro ao carregar mensagens');
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar mensagens');
      }
    };

    fetchMessages();
  }, [initialConversationId, conversationId, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = initialConversationId || conversationId;
    const trimmed = body.trim();
    if (!trimmed || !id || sending) return;

    setSending(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/conversations/${id}/messages`, {
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
      {loading ? (
        <div className="py-8 text-center text-gray-500">Carregando conversa...</div>
      ) : !effectiveConversationId ? (
        <div className="py-8 text-center text-gray-500">Conversa não disponível.</div>
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
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        msg.sender_type === 'admin'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className="text-xs opacity-80 mt-1">
                        {msg.sender_type === 'admin'
                          ? (msg.sender_admin_id && msg.sender_admin_id === currentAdminId
                              ? 'Você'
                              : msg.Admin?.email ?? 'Líder')
                          : msg.Teacher?.nome ?? 'Facilitador'}
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
