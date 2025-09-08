import { Injectable, type LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  className?: string;
  handlerName?: string;
  module?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private write(level: LogLevel, message: string, data?: unknown) {
    const payload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(typeof data === 'object' && data !== null ? data : { data }),
    } as any;
    console.log(JSON.stringify(payload));
  }

  log(message: any, context?: LogContext) {
    this.write('info', String(message), context);
  }
  error(message: any, trace?: string, context?: LogContext) {
    this.write('error', String(message), { ...context, trace });
  }
  warn(message: any, context?: LogContext) {
    this.write('warn', String(message), context);
  }
  debug?(message: any, context?: LogContext) {
    this.write('debug', String(message), context);
  }

  info(message: string, context?: LogContext) {
    this.write('info', message, context);
  }
}

export function sanitizeData<T>(data: T): T {
  const SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'authorization',
    'authorizationBearer',
    'idempotencyKey',
    'Idempotency-Key',
  ]);

  const seen = new WeakSet();
  const redact = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) return value.map((v) => redact(v));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redact(v);
    }
    return out;
  };
  return redact(data);
}

export interface ErrorLink {
  name?: string;
  message?: string;
  stack?: string;
}

export function extractErrorChain(
  err: unknown,
  options?: { includeStack?: boolean; maxDepth?: number },
): ErrorLink[] {
  const includeStack = options?.includeStack ?? false;
  const maxDepth = options?.maxDepth ?? 5;

  const chain: ErrorLink[] = [];
  const seen = new Set<any>();
  let current: any = err;
  let depth = 0;
  while (current && depth < maxDepth && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error || (typeof current === 'object' && current)) {
      chain.push({
        name: current.name,
        message: current.message,
        stack: includeStack ? current.stack : undefined,
      });
      current = current.cause;
    } else {
      chain.push({ name: typeof current, message: String(current) });
      break;
    }
    depth++;
  }
  return chain;
}
