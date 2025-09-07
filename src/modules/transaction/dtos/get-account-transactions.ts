import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getAccountTransactionsSchemaValidation = {
  params: z.object({
    accountId: z.string().ulid(),
  }),
  queryParams: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    order: z.enum(['asc', 'desc']).default('asc'),
    status: z.enum(['PENDING', 'APPLIED', 'REJECTED']).optional(),
  }),
  response: z.object({
    accountId: z.string().ulid(),
    transactions: z.array(
      z.object({
        id: z.string().ulid(),
        type: z.enum(['DEPOSIT', 'WITHDRAW', 'TRANSFER']),
        amount: z.number(),
        fee: z.number(),
        description: z.string().max(280).optional().nullable(),
        status: z.enum(['PENDING', 'APPLIED', 'REJECTED']),
        createdAt: z.date(),
        transferId: z.string().ulid().nullable().optional(),
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
      status: z.enum(['PENDING', 'APPLIED', 'REJECTED']).optional().nullable(),
    }),
  }),
} satisfies SchemaValidation;

export namespace getAccountTransactionsDTO {
  export class GetAccountTransactionsParams extends createZodDto(
    getAccountTransactionsSchemaValidation.params,
  ) {}

  export class GetAccountTransactionsQuery extends createZodDto(
    getAccountTransactionsSchemaValidation.queryParams,
  ) {}

  export class GetAccountTransactionsOutput extends createZodDto(
    getAccountTransactionsSchemaValidation.response,
  ) {}
}
