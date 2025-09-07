import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class IdempotencyKeyMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: any) {
    const header =
      (req.get && req.get('Idempotency-Key')) ||
      (req.headers && req.headers['idempotency-key']);
    const key =
      typeof header === 'string' && header.trim().length > 0
        ? header.trim()
        : randomUUID();

    req.idempotencyKey = key;
    if (req.headers) {
      req.headers['idempotency-key'] = key;
    }
    next();
  }
}
