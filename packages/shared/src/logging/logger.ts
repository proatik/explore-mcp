import { requestContext } from './request-context';
import { LogLevelSchema } from './log-level.schema';

import type { LogLevel } from './log-level.schema';

export type LogContext = Record<string, unknown>;

export interface Logger {
  log(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

const SECRET_FIELD =
  /(authorization|token|secret|password|consumer_?key|api_?key|email|phone|address)/i;

// bounded so a cyclic object can never recurse forever.
const MAX_REDACT_DEPTH = 6;

let minimumLevel = LogLevelSchema.catch('info').parse(process.env.LOG_LEVEL);

let writeLine = (line: string): void => {
  process.stderr.write(`${line}\n`);
};

export function configureLogging(options: {
  level: LogLevel;
  write?: (line: string) => void;
}): void {
  minimumLevel = options.level;

  if (options.write) writeLine = options.write;
}

export function createLogger(name: string): Logger {
  return {
    log: (message, context) => {
      write('info', name, message, context);
    },
    warn: (message, context) => {
      write('warn', name, message, context);
    },
    debug: (message, context) => {
      write('debug', name, message, context);
    },
    error: (message, error, context) => {
      const errorField =
        error === undefined ? {} : { error: serializeError(error) };

      write('error', name, message, { ...context, ...errorField });
    }
  };
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACT_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_FIELD.test(key) ? '[redacted]' : redact(item, depth + 1)
    ])
  );
}

function write(
  level: LogLevel,
  name: string,
  message: string,
  context?: LogContext
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel]) return;

  const request = requestContext.getStore();

  writeLine(
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      logger: name,
      message,
      ...(request
        ? { requestId: request.requestId, clientId: request.clientId }
        : {}),
      ...(context ? (redact(context) as LogContext) : {})
    })
  );
}

function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}
