import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getAccountTransactionsSchemaValidation = {
  params: z.object({
    accountId: z.string().ulid().describe('Identificador ULID da conta.'),
  }),
  queryParams: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .describe('Página atual (>= 1).'),
    perPage: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe('Itens por página (1-100).'),
    order: z
      .enum(['asc', 'desc'])
      .default('asc')
      .describe('Ordenação por data de criação.'),
    status: z
      .enum(['PENDING', 'APPLIED', 'REJECTED'])
      .optional()
      .describe('Filtra por status da transação.'),
  }),
  response: z.object({
    accountId: z.string().ulid().describe('Identificador ULID da conta.'),
    transactions: z.array(
      z.object({
        id: z.string().ulid().describe('Identificador da transação.'),
        type: z
          .enum(['DEPOSIT', 'WITHDRAW', 'TRANSFER'])
          .describe('Tipo da transação.'),
        amount: z.number().describe('Valor da transação.'),
        fee: z.number().describe('Taxa aplicada.'),
        description: z
          .string()
          .max(280)
          .optional()
          .nullable()
          .describe('Descrição da transação.'),
        status: z
          .enum(['PENDING', 'APPLIED', 'REJECTED'])
          .describe('Status da transação.'),
        createdAt: z.date().describe('Data de criação.'),
        transferId: z
          .string()
          .ulid()
          .nullable()
          .optional()
          .describe('ID da transferência (se aplicável).'),
      }),
    ),
    meta: z.object({
      page: z.number().describe('Página atual.'),
      perPage: z.number().describe('Itens por página.'),
      total: z.number().describe('Total de itens.'),
      totalPages: z.number().describe('Total de páginas.'),
      hasNext: z.boolean().describe('Existe próxima página?'),
      hasPrevious: z.boolean().describe('Existe página anterior?'),
      order: z.enum(['asc', 'desc']).describe('Ordenação aplicada.'),
      status: z
        .enum(['PENDING', 'APPLIED', 'REJECTED'])
        .optional()
        .nullable()
        .describe('Filtro de status aplicado.'),
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
