'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';

interface TeacherNotification {
  id: string;
  type: 'leader_message';
  conversationId: string;
  createdAt: string;
  class: { id: string; grupo_repense: string; horario: string | null };
  student: { id: string; nome: string } | null;
  preview: string;
}

interface TeacherNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  onMarkRead?: () => void;
}

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

export function TeacherNotificationDropdown({
  isOpen,
  onClose,
  count,
  onMarkRead,
}: TeacherNotificationDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<TeacherNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      fetch('/api/teacher/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : { notifications: [] }))
        .then((data) => setNotifications(data.notifications || []))
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const token = getAuthToken();
      await fetch('/api/teacher/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationIds: notifications.map((n) => n.id) }),
      });
      toast.success('Todas as notificações marcadas como lidas');
      onMarkRead?.();
      onClose();
      router.push('/teacher/messages');
    } catch {
      toast.error('Erro ao marcar como lidas');
    }
  };

  const handleNotificationClick = async (n: TeacherNotification) => {
    try {
      const token = getAuthToken();
      await fetch('/api/teacher/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'leader_message', referenceId: n.conversationId }),
      });
      onMarkRead?.();
    } catch {
      // ignore
    }
    onClose();
    router.push('/teacher/messages');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="w-96 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[400px] flex flex-col"
    >
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellIcon />
          <h3 className="font-semibold text-gray-900">Notificações</h3>
        </div>
        {count > 0 && (
          <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p>Carregando...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageIcon />
            <p className="mt-2">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <MessageIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary">Nova mensagem</span>
                      <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {n.class.grupo_repense} – {n.class.horario || 'Sem horário'}
                      {n.student && ` – ${n.student.nome}`}
                    </p>
                    {n.preview && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{n.preview}</p>
                    )}
                  </div>
                  <ChevronRightIcon />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
