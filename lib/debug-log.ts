type DebugLogPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
};

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6';

/**
 * Debug log helper for runtime analysis.
 * Do not include secrets or PII in payload data.
 */
export function debugLog(payload: DebugLogPayload) {
  const body = {
    ...payload,
    timestamp: payload.timestamp ?? Date.now(),
    sessionId: payload.sessionId ?? 'debug-session',
  };

  try {
    fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // Intentionally ignore logging failures.
  }
}
