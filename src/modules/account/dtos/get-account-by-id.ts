import type { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getAccountByIdSchemaValidation = {
  params: z.object({
    accountId: z.string().ulid().describe('Identificador ULID da conta.'),
  }),
  response: z.object({
    id: z.string().ulid().describe('Identificador ULID da conta.'),
    number: z.string().describe('Número da conta (exibição/identificação).'),
    balance: z
      .number()
      .min(0)
      .positive()
      .describe('Saldo atual da conta em unidades monetárias.'),
    creditLimit: z
      .number()
      .min(0)
      .positive()
      .describe('Limite de crédito disponível para a conta.'),
  }),
} satisfies SchemaValidation;

type GetAccountByIdParams = z.infer<
  typeof getAccountByIdSchemaValidation.params
>;

export namespace getAccountByIdDTO {
  export class GetAccountByIdParamsDTO implements GetAccountByIdParams {
    @ApiProperty({
      required: true,
      description: 'Identificador ULID da conta.',
      example: '01J9MZ3ZYK2J4TN2YCE2V7ZVB8',
      format: 'ulid',
      pattern: '^[0-9A-HJKMNP-TV-Z]{26}$',
    })
    accountId!: string;
  }
  export class GetAccountByIdInput extends createZodDto(
    getAccountByIdSchemaValidation.params,
  ) {}
  export class GetAccountByIdOutput extends createZodDto(
    getAccountByIdSchemaValidation.response,
  ) {}
}
