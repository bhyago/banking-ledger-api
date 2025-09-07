import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  type Observable,
  catchError,
  finalize,
  map,
  of,
  throwError,
} from 'rxjs';
import {
  StructuredLoggerService,
  sanitizeData,
  extractErrorChain,
} from './structured-logger.service';
import { classifyKnownError } from './known-errors';
import { randomUUID } from 'crypto';

@Injectable()
export class AppLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const requestId = this.getOrCreateRequestId(context);

    if (context.getType() === 'http') {
      const httpCtx = context.switchToHttp();
      const req = httpCtx.getRequest<any>();
      const method = req.method;
      const path = req.originalUrl || req.url;
      const input = sanitizeData({
        params: req.params,
        query: req.query,
        body: req.body,
        headers: {
          ...req.headers,
          authorization: req.headers?.authorization ? '[REDACTED]' : undefined,
        },
      });

      this.logger.info('Request started', {
        requestId,
        className,
        handlerName,
        method,
        path,
        input,
      });

      let responseBody: unknown;

      return next.handle().pipe(
        map((data) => {
          responseBody = data;
          return data;
        }),
        catchError((err) => {
          if (err instanceof HttpException) {
            const status =
              err.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
            const isClientErr = status >= 400 && status < 500;
            const log = isClientErr
              ? this.logger.warn.bind(this.logger)
              : this.logger.error.bind(this.logger);
            log(
              isClientErr ? 'Client error' : 'Server error',
              (err as any)?.stack,
              {
                requestId,
                className,
                handlerName,
                method,
                path,
                error: sanitizeData({
                  name: (err as any)?.name,
                  message: (err as any)?.message,
                }),
              },
            );
            return throwError(() => err);
          }
          const known = classifyKnownError(err);
          if (known.isKnown) {
            this.logger.warn('Known error', {
              requestId,
              className,
              handlerName,
              method,
              path,
              error: {
                name: known.name,
                message: known.message,
                cause: extractErrorChain(err, { includeStack: false }),
              },
            });
            return throwError(
              () =>
                new HttpException(
                  { name: known.name, message: known.message },
                  known.status,
                ),
            );
          }
          this.logger.error('Unknown error', (err as any)?.stack, {
            requestId,
            className,
            handlerName,
            method,
            path,
            error: sanitizeData({
              name: (err as any)?.name,
              message: (err as any)?.message,
              cause: extractErrorChain(err, { includeStack: true }),
            }),
          });
          return throwError(
            () =>
              new HttpException(
                {
                  name: 'INTERNAL_SERVER_ERROR',
                  message: 'Internal server error',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
        }),
        finalize(() => {
          const durationMs = Date.now() - now;
          this.logger.info('Request completed', {
            requestId,
            className,
            handlerName,
            method,
            path,
            durationMs,
            output: sanitizeData(responseBody),
          });
        }),
      );
    }

    this.logger.info('Execution started', {
      requestId,
      className,
      handlerName,
    });
    let result: unknown;
    return next.handle().pipe(
      map((data) => {
        result = data;
        return data;
      }),
      catchError((err) => {
        const known = classifyKnownError(err);
        if (known.isKnown) {
          this.logger.warn('Known error', {
            requestId,
            className,
            handlerName,
            error: {
              name: known.name,
              message: known.message,
              cause: extractErrorChain(err, { includeStack: false }),
            },
          });
        } else {
          this.logger.error('Unknown error', (err as any)?.stack, {
            requestId,
            className,
            handlerName,
            error: sanitizeData({
              name: (err as any)?.name,
              message: (err as any)?.message,
              cause: extractErrorChain(err, { includeStack: true }),
            }),
          });
        }
        return throwError(() => err);
      }),
      finalize(() => {
        const durationMs = Date.now() - now;
        this.logger.info('Execution completed', {
          requestId,
          className,
          handlerName,
          durationMs,
          output: sanitizeData(result),
        });
      }),
    );
  }

  private getOrCreateRequestId(context: ExecutionContext): string {
    if (context.getType() !== 'http') return randomUUID();
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<any>();
    const existing =
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      req.headers['idempotency-key'];
    const id = String(existing || randomUUID());
    req.requestId = id;
    return id;
  }
}
