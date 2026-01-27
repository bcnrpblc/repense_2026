import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface AuditEventData {
  event_type: string;
  actor_id?: string;
  actor_type?: 'admin' | 'teacher' | 'student' | 'system';
  target_entity?: string;
  target_id?: string;
  action?: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure' | 'error';
  error_message?: string;
}

function logAuditEventToFallback(
  data: AuditEventData,
  error: unknown,
  request?: NextRequest
): void {
  const timestamp = new Date().toISOString();
  const ip_address =
    request?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request?.headers.get('x-real-ip') ||
    'unknown';
  const user_agent = request?.headers.get('user-agent') || 'unknown';

  console.error('[AUDIT_LOG_FAILURE]', {
    timestamp,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    event_data: {
      ...data,
      ip_address,
      user_agent,
    },
  });
}

export async function logAuditEvent(
  data: AuditEventData,
  request?: NextRequest
): Promise<void> {
  try {
    const ip_address =
      request?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request?.headers.get('x-real-ip') ||
      'unknown';
    const user_agent = request?.headers.get('user-agent') || 'unknown';

    prisma.auditLog
      .create({
        data: {
          ...data,
          ip_address,
          user_agent,
          status: data.status || 'success',
        },
      })
      .catch((error) => {
        logAuditEventToFallback(data, error, request);
      });
  } catch (error) {
    logAuditEventToFallback(data, error, request);
  }
}

export function getChangedFields<T extends Record<string, any>>(
  oldData: T,
  newData: T
): string[] {
  const changed: string[] = [];
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changed.push(key);
    }
  }
  return changed;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  return '***' + phone.slice(-4);
}

