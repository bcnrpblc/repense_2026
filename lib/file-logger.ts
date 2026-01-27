// Server-only module - uses Node.js fs
import fs from 'fs';
import path from 'path';

// Only run on server side
if (typeof window !== 'undefined') {
  throw new Error('file-logger can only be used on the server side');
}

const LOG_DIR = process.env.LOG_DIR || '/app/logs';
const ERROR_LOG_FILE = path.join(LOG_DIR, 'errors.log');
const APP_LOG_FILE = path.join(LOG_DIR, 'app.log');

// Lazy initialization - only create directory when first needed
let logDirInitialized = false;

function ensureLogDir() {
  if (logDirInitialized) return;
  
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    logDirInitialized = true;
  } catch (error) {
    // If we can't create the directory, log to console as fallback
    console.error('Failed to create log directory:', error);
  }
}

function writeToFile(filePath: string, data: string) {
  ensureLogDir(); // Ensure directory exists before writing
  
  try {
    // Append to file with newline
    fs.appendFileSync(filePath, data + '\n', { encoding: 'utf8' });
  } catch (error) {
    // Fallback to console if file write fails
    console.error('Failed to write to log file:', error);
    console.log(data);
  }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  level: LogLevel;
  message: string;
  time: string;
  [key: string]: unknown;
};

function normalizeError(err: unknown) {
  if (!(err instanceof Error)) return err;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

export function logToFile(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    time: new Date().toISOString(),
    ...data,
  };

  if (data?.err) {
    entry.err = normalizeError(data.err);
  }

  const logLine = JSON.stringify(entry);

  // Always write to console (for Docker logs)
  console.log(logLine);

  // Write to appropriate log file
  if (level === 'error') {
    writeToFile(ERROR_LOG_FILE, logLine);
  }
  
  // Write all logs to app.log
  writeToFile(APP_LOG_FILE, logLine);
}

export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const errorData = {
    ...context,
    err: error,
  };
  logToFile('error', message, errorData);
}

export function logInfo(message: string, data?: Record<string, unknown>) {
  logToFile('info', message, data);
}

export function logWarn(message: string, data?: Record<string, unknown>) {
  logToFile('warn', message, data);
}

export function logDebug(message: string, data?: Record<string, unknown>) {
  logToFile('debug', message, data);
}
