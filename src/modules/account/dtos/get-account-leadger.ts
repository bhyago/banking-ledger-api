import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
  export class GetAccountLedgerInput extends createZodDto(
    getAccountLedgerSchemaValidation.params,
  ) {}
  export class GetAccountLedgerOutput extends createZodDto(
    getAccountLedgerSchemaValidation.response,
  ) {}
}
