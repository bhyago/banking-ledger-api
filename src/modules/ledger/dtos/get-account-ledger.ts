import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getAccountLedgerSchemaValidation = {
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
      .describe('Ordenação por data dos lançamentos.'),
  }),
  response: z.object({
    accountId: z.string().ulid().describe('Identificador ULID da conta.'),
    ledger: z.array(
      z.object({
        id: z.string().ulid().describe('Identificador do lançamento no razão.'),
        description: z
          .string()
          .max(280)
          .optional()
          .nullable()
          .describe('Descrição do lançamento.'),
        amount: z.number().min(0).positive().describe('Valor movimentado.'),
        balanceAfterCents: z
          .number()
          .min(0)
          .positive()
          .describe('Saldo após o lançamento.'),
        createdAt: z.date().describe('Data de criação do lançamento.'),
        type: z.enum(['debit', 'credit']).describe('Tipo do lançamento.'),
        transactionId: z
          .string()
          .ulid()
          .nullable()
          .describe('Transação relacionada (se houver).'),
        transferId: z
          .string()
          .ulid()
          .nullable()
          .describe('Transferência relacionada (se houver).'),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/, 'Moeda ISO 4217 inválida')
          .default('BRL')
          .describe('Moeda no padrão ISO 4217.'),
      }),
    ),
    meta: z.object({
      page: z.number().describe('Página atual.'),
      perPage: z.number().describe('Itens por página.'),
      total: z.number().describe('Total de lançamentos.'),
      totalPages: z.number().describe('Total de páginas.'),
      hasNext: z.boolean().describe('Existe próxima página?'),
      hasPrevious: z.boolean().describe('Existe página anterior?'),
      order: z.enum(['asc', 'desc']).describe('Ordenação aplicada.'),
    }),
  }),
} satisfies SchemaValidation;

export namespace getAccountLedgerDTO {
  export class GetAccountLedgerParamDTO extends createZodDto(
    getAccountLedgerSchemaValidation.params,
  ) {}
  export class GetAccountLedgerQueryDTO extends createZodDto(
    getAccountLedgerSchemaValidation.queryParams,
  ) {}

  export class GetAccountLedgerInput extends createZodDto(
    getAccountLedgerSchemaValidation.params.merge(
      getAccountLedgerSchemaValidation.queryParams,
    ),
  ) {}

  export class GetAccountLedgerOutput extends createZodDto(
    getAccountLedgerSchemaValidation.response,
  ) {}
}
