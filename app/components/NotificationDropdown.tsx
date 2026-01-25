'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NotificationCounts {
  studentObservations: number;
  sessionReports: number;
  finalReports: number;
  total: number;
}

interface Notification {
  id: string;
  type: 'student_observation' | 'session_report' | 'final_report';
  referenceId: string;
  createdAt: string;
  preview: string;
  student?: {
    id: string;
    nome: string;
  };
  session?: {
    id: string;
    numero_sessao: number;
    data_sessao: string;
  };
  class: {
    id: string;
    grupo_repense: string;
    horario: string | null;
  };
  teacher?: {
    id: string;
    nome: string;
  };
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  counts: NotificationCounts;
}

// ============================================================================
// ICONS
// ============================================================================

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
    />
  </svg>
);

const StudentIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
    />
  </svg>
);

const SessionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
    />
  </svg>
);

const ClassIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'student_observation':
      return 'Relatório Participante';
    case 'session_report':
      return 'Relatório de Encontro';
    case 'final_report':
      return 'Relatório de Grupo';
    default:
      return type;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'student_observation':
      return <StudentIcon />;
    case 'session_report':
      return <SessionIcon />;
    case 'final_report':
      return <ClassIcon />;
    default:
      return null;
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'student_observation':
      return 'bg-blue-100 text-blue-800';
    case 'session_report':
      return 'bg-green-100 text-green-800';
    case 'final_report':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ============================================================================
// NOTIFICATION DROPDOWN COMPONENT
// ============================================================================

export function NotificationDropdown({ isOpen, onClose, counts }: NotificationDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
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

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;

    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notificationIds: notifications.map((n) => n.id),
        }),
      });

      if (response.ok) {
        toast.success('Todas as notificações marcadas como lidas');
        onClose();
        // Refresh counts by reloading page or triggering parent refresh
        window.location.reload();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erro ao marcar como lidas');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on type
    if (notification.type === 'student_observation' && notification.student) {
      router.push(`/admin/students/${notification.student.id}`);
    } else if (notification.type === 'session_report' && notification.session) {
      router.push(`/admin/classes/${notification.class.id}`);
    } else if (notification.type === 'final_report') {
      router.push(`/admin/classes/${notification.class.id}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="w-96 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellIcon />
          <h3 className="font-semibold text-gray-900">Notificações</h3>
        </div>
        {counts.total > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Count Summary */}
      {counts.total > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex gap-4 text-xs">
          <span className="text-gray-600">
            Participante: <span className="font-medium text-blue-600">{counts.studentObservations}</span>
          </span>
          <span className="text-gray-600">
            Encontro: <span className="font-medium text-green-600">{counts.sessionReports}</span>
          </span>
          <span className="text-gray-600">
            Grupo: <span className="font-medium text-purple-600">{counts.finalReports}</span>
          </span>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Carregando...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BellIcon />
            <p className="mt-2">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getTypeBadgeColor(notification.type)}`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeBadgeColor(notification.type)}`}>
                        {getTypeLabel(notification.type)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    {notification.student && (
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {notification.student.nome}
                      </p>
                    )}
                    {notification.session && (
                      <p className="text-xs text-gray-500 mb-1">
                        Encontro {notification.session.numero_sessao} - {notification.class.grupo_repense}
                      </p>
                    )}
                    {notification.class && !notification.session && (
                      <p className="text-xs text-gray-500 mb-1">
                        {notification.class.grupo_repense} - {notification.class.horario || 'Sem horário'}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.preview}
                    </p>
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
