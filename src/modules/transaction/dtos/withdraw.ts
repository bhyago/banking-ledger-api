import type { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const withdrawSchemaValidation = {
  params: z.object({
    accountId: z.string().describe('Identificador ULID da conta.'),
  }),
  headers: z
    .object({
      'idempotency-key': z
        .string()
        .uuid()
        .describe('Chave de idempotência (UUID v4).'),
    })
    .passthrough(),
  body: z.object({
    amount: z
      .number()
      .positive()
      .describe('Valor do saque em unidades monetárias.'),
    description: z
      .string()
      .max(280)
      .optional()
      .describe('Descrição opcional do saque.'),
  }),
  response: z.object({
    transactionId: z.string().describe('Identificador da transação gerada.'),
    accountId: z.string().describe('Identificador da conta.'),
    newBalance: z.number().describe('Novo saldo após o saque.'),
    feeApplied: z.number().describe('Taxa aplicada ao saque.'),
  }),
} satisfies SchemaValidation;

type WithdrawParams = z.infer<typeof withdrawSchemaValidation.params>;
type WithdrawBody = z.infer<typeof withdrawSchemaValidation.body>;

export namespace withdrawDTO {
  export class WithdrawParamsDTO implements WithdrawParams {
    @ApiProperty({
      required: true,
      description: 'Identificador ULID da conta.',
      example: '01J9MZ3ZYK2J4TN2YCE2V7ZVB8',
      format: 'ulid',
    })
    accountId!: string;
  }
  export class WithdrawBodyDTO implements WithdrawBody {
    @ApiProperty({
      required: true,
      description: 'Valor do saque.',
      example: 50.25,
    })
    amount!: number;
    @ApiProperty({
      required: false,
      description: 'Descrição do saque.',
      example: 'Saque no ATM',
    })
    description?: string;
  }

  export class WithdrawInput extends createZodDto(
    withdrawSchemaValidation.body.merge(withdrawSchemaValidation.params),
  ) {}

  export class WithdrawOutput extends createZodDto(
    withdrawSchemaValidation.response,
  ) {}
}
