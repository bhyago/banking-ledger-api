import type { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const depositSchemaValidation = {
  params: z.object({
    accountId: z.string().describe('Identificador ULID da conta.'),
  }),
  body: z.object({
    amount: z
      .number()
      .positive()
      .describe('Valor do depósito em unidades monetárias.'),
    description: z
      .string()
      .max(280)
      .optional()
      .describe('Descrição opcional do depósito.'),
  }),
  response: z.object({
    transactionId: z.string().describe('Identificador da transação gerada.'),
    accountId: z.string().describe('Identificador da conta.'),
    newBalance: z.number().min(0).describe('Novo saldo após o depósito.'),
  }),
} satisfies SchemaValidation;

type DepositParams = z.infer<typeof depositSchemaValidation.params>;
type DepositBody = z.infer<typeof depositSchemaValidation.body>;

export namespace depositDTO {
  export class DepositParamsDTO implements DepositParams {
    @ApiProperty({
      required: true,
      description: 'Identificador ULID da conta.',
      example: '01J9MZ3ZYK2J4TN2YCE2V7ZVB8',
      format: 'ulid',
    })
    accountId!: string;
  }
  export class DepositBodyDTO implements DepositBody {
    @ApiProperty({
      required: true,
      description: 'Valor do depósito.',
      example: 100.5,
    })
    amount!: number;
    @ApiProperty({
      required: false,
      description: 'Descrição do depósito.',
      example: 'Depósito via PIX',
    })
    description?: string;
  }
  export class DepositInput extends createZodDto(
    depositSchemaValidation.body.merge(depositSchemaValidation.params),
  ) {}
  export class DepositOutput extends createZodDto(
    depositSchemaValidation.response,
  ) {}
}
