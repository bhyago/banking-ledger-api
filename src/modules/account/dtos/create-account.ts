import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAccountSchemaValidation = {
  body: z.object({
    creditLimit: z
      .number()
      .min(0)
      .describe('Limite de crédito inicial. Padrão: 0.'),
    fullName: z.string().min(3).max(120).describe('Nome completo do titular.'),
    cpf: z.string().describe('CPF do titular'),
  }),
  response: z.object({
    accountId: z.string().describe('Identificador ULID da conta criada.'),
  }),
} satisfies SchemaValidation;

export namespace createAccountDTO {
  export class CreateAccountInput extends createZodDto(
    createAccountSchemaValidation.body,
  ) {}
  export class CreateAccountOutput extends createZodDto(
    createAccountSchemaValidation.response,
  ) {}
}
