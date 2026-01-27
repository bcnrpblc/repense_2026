'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';

interface EventCardProps {
  event: {
    id: string;
    event_type: string;
    actor_type: string | null;
    actor_id: string | null;
    target_entity: string | null;
    target_id: string | null;
    action: string | null;
    status: string;
    metadata: Record<string, any> | null;
    criado_em: string | Date;
    Actor?: {
      email: string | null;
      role: string | null;
    } | null;
  };
}

function formatTimestamp(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('pt-BR');
}

function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'agora';
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  return formatTimestamp(value);
}

function getIcon(eventType: string) {
  if (eventType.startsWith('auth_')) {
    return '🔑';
  }
  if (eventType.startsWith('data_')) {
    return '✏️';
  }
  if (eventType.startsWith('admin_') || eventType.startsWith('permission_')) {
    return '🛡️';
  }
  if (eventType.toLowerCase().includes('error') || eventType === 'failure') {
    return '⚠️';
  }
  return '📄';
}

function getActionDescription(event: EventCardProps['event']): string {
  const { event_type, action, target_entity } = event;
  
  if (action && target_entity) {
    const actionMap: Record<string, string> = {
      'create': 'criou',
      'update': 'atualizou',
      'delete': 'excluiu',
      'archive': 'arquivou',
      'unarchive': 'desarquivou',
      'complete': 'concluiu',
      'cancel': 'cancelou',
      'transfer': 'transferiu',
      'login': 'fez login',
      'password_reset': 'redefiniu senha',
    };
    
    const entityMap: Record<string, string> = {
      'Student': 'participante',
      'Class': 'grupo',
      'Enrollment': 'inscrição',
      'Admin': 'administrador',
      'Teacher': 'facilitador',
    };
    
    const actionText = actionMap[action] || action;
    const entityText = entityMap[target_entity] || target_entity.toLowerCase();
    
    return `${actionText} ${entityText}`;
  }
  
  if (event_type === 'auth_login_success') {
    return 'Login realizado com sucesso';
  }
  if (event_type === 'auth_login_failure') {
    return 'Tentativa de login falhou';
  }
  
  return 'Ação registrada';
}

export function EventCard({ event }: EventCardProps) {
  const [open, setOpen] = useState(false);

  const actorLabel =
    event.Actor?.email ||
    (event.actor_type ? `${event.actor_type} ${event.actor_id ?? ''}` : 'Sistema');

  return (
    <Card className="border border-gray-200" padding="sm">
      <button
        type="button"
        className="w-full text-left flex items-start justify-between gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl" aria-hidden="true">
            {getIcon(event.event_type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {event.event_type}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  event.status === 'success'
                    ? 'bg-green-50 text-green-700'
                    : event.status === 'failure'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                {event.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-900">
              {getActionDescription(event)}
            </p>
            <p className="mt-1 text-xs text-gray-500" title={formatTimestamp(event.criado_em)}>
              {actorLabel} • {formatRelativeTime(event.criado_em)}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {open ? 'Fechar' : 'Detalhes'}
        </span>
      </button>

      {open && event.metadata && (
        <div className="mt-3 text-xs bg-gray-50 rounded-md p-3 overflow-x-auto">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

