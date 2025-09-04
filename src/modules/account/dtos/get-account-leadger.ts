import { createZodDto } from 'nestjs-zod';
import { z, ZodTypeAny } from 'zod';

type SchemaValidation<
  TBody extends ZodTypeAny = ZodTypeAny,
  TResponse extends ZodTypeAny = ZodTypeAny,
  THeaders extends ZodTypeAny = ZodTypeAny,
  TQueryParams extends ZodTypeAny = ZodTypeAny,
  TParams extends ZodTypeAny = ZodTypeAny,
> = {
  body?: TBody;
  response?: TResponse;
  headers?: THeaders;
  queryParams?: TQueryParams;
  params?: TParams;
};

export const getAccountLedgerSchemaValidation = {
  params: z.object({
    accountId: z.string().ulid(),
  }),
  response: z.object({
    accountId: z.string().ulid(),
    ledger: z.array(
      z.object({
        id: z.string().ulid(),
        description: z.string().max(280).optional().nullable(),
        amount: z.number().min(0).positive(),
        balanceAfterCents: z.number().min(0).positive(),
        createdAt: z.date(),
        type: z.enum(['debit', 'credit']),
        txId: z.string().ulid().nullable(),
        transferId: z.string().ulid().nullable(),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/, 'Moeda ISO 4217 inválida')
          .default('BRL'),
      }),
    ),
  }),
} satisfies SchemaValidation;

export namespace getAccountLedgerDTO {
  export class Input extends createZodDto(
    getAccountLedgerSchemaValidation.params,
  ) {}
  export class Output extends createZodDto(
    getAccountLedgerSchemaValidation.response,
  ) {}
}
