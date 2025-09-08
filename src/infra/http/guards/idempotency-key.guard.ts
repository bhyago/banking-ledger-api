import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class IdempotencyKeyGuard implements CanActivate {
  private readonly uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { headers: Record<string, unknown> }>();
    const raw = req.headers?.['idempotency-key'];

    if (raw === undefined || raw === null || raw === '') {
      throw new BadRequestException({
        message: "Header 'idempotency-key' é obrigatório",
        statusCode: 400,
      });
    }

    const value = Array.isArray(raw) ? raw[0] : String(raw);
    if (!this.uuidV4Regex.test(value)) {
      throw new BadRequestException({
        message: "Header 'idempotency-key' deve ser um UUID v4 válido",
        statusCode: 400,
      });
    }

    return true;
  }
}
