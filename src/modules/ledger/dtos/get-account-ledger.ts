import { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getAccountLedgerSchemaValidation = {
  params: z.object({
    accountId: z.string().ulid(),
  }),
  queryParams: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    order: z.enum(['asc', 'desc']).default('asc'),
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
        transactionId: z.string().ulid().nullable(),
        transferId: z.string().ulid().nullable(),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/, 'Moeda ISO 4217 inválida')
          .default('BRL'),
      }),
    ),
    meta: z.object({
      page: z.number(),
      perPage: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
      order: z.enum(['asc', 'desc']),
    }),
  }),
} satisfies SchemaValidation;

const InputSchema = getAccountLedgerSchemaValidation.params.merge(
  getAccountLedgerSchemaValidation.queryParams,
);

export namespace getAccountLedgerDTO {
  export class ParamDTO extends createZodDto(
    getAccountLedgerSchemaValidation.params,
  ) {}
  export class QueryDTO extends createZodDto(
    getAccountLedgerSchemaValidation.queryParams,
  ) {}

  export class Input extends createZodDto(InputSchema) {}

  export class Output extends createZodDto(
    getAccountLedgerSchemaValidation.response,
  ) {}
}
