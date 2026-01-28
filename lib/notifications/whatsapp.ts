/**
 * Server-side WhatsApp notification helpers via n8n webhooks.
 * Used for admin-initiated student transfers.
 */

import { formatDayOfWeek, formatTime } from '@/lib/date-formatters';

const WEBHOOK_URL =
  process.env.N8N_WHATSAPP_TRANSFER_WEBHOOK ||
  'https://atendimento-n8n.42odzg.easypanel.host/webhook/whatsapp_confirmation';

const TIMEOUT_MS = 5000;

export type SendTransferNotificationParams = {
  studentId?: string;
  studentName: string;
  studentPhone: string;
  oldCourse: string;
  oldClassSchedule: string;
  oldClassCity: string;
  oldClassTeacher: string;
  newCourse: string;
  newClassSchedule: string;
  newClassCity: string;
  newClassTeacher: string;
  newClassStartDate: string | null;
  newClassWhatsAppLink: string | null;
};

export type SendTransferNotificationResult = {
  success: boolean;
  error?: string;
};

/**
 * Sends a WhatsApp transfer notification via n8n webhook.
 * Never throws; returns { success, error? } and logs attempts.
 * Notification failure must not break the transfer flow.
 */
export async function sendTransferNotification(
  params: SendTransferNotificationParams
): Promise<SendTransferNotificationResult> {
  const payload = {
    type: 'admin_transfer' as const,
    student: {
      ...(params.studentId != null && { id: params.studentId }),
      nome: params.studentName,
      telefone: params.studentPhone,
    },
    oldClass: {
      course: params.oldCourse,
      schedule: params.oldClassSchedule,
      city: params.oldClassCity,
      teacher: params.oldClassTeacher,
    },
    newClass: {
      course: params.newCourse,
      schedule: params.newClassSchedule,
      city: params.newClassCity,
      teacher: params.newClassTeacher,
      startDate: params.newClassStartDate,
      whatsappLink: params.newClassWhatsAppLink,
    },
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const text = await response.text();
      const result: SendTransferNotificationResult = {
        success: false,
        error: `HTTP ${response.status}: ${text || response.statusText}`,
      };
      console.log('[WhatsApp] Transfer notification failed:', result);
      return result;
    }

    const result: SendTransferNotificationResult = { success: true };
    console.log('[WhatsApp] Transfer notification sent:', result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const result: SendTransferNotificationResult = {
      success: false,
      error: message,
    };
    console.log('[WhatsApp] Transfer notification error:', result);
    return result;
  }
}

/**
 * Builds a schedule string for notification payload.
 * e.g. "Terça-feira 20h" or "Terça-feira 16h30"
 */
export function buildClassSchedule(
  dataInicio: Date | string | null | undefined,
  horario: string | null | undefined
): string {
  const time = formatTime(horario);
  if (dataInicio && time) {
    const day = formatDayOfWeek(dataInicio);
    return day ? `${day} ${time}` : time;
  }
  return time || 'N/A';
}
