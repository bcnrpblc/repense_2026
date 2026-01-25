export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = Record<string, unknown> & {
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  duration_ms?: number;
  err?: unknown;
};

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const defaultLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[defaultLevel];
}

function normalizeError(err: unknown) {
  if (!(err instanceof Error)) return err;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function writeLog(level: LogLevel, message: string, data?: LogPayload) {
  if (!shouldLog(level)) return;
  const payload: Record<string, unknown> = {
    level,
    message,
    time: new Date().toISOString(),
    ...data,
  };

  if (data?.err) {
    payload.err = normalizeError(data.err);
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  debug: (message: string, data?: LogPayload) => writeLog('debug', message, data),
  info: (message: string, data?: LogPayload) => writeLog('info', message, data),
  warn: (message: string, data?: LogPayload) => writeLog('warn', message, data),
  error: (message: string, data?: LogPayload) => writeLog('error', message, data),
};
