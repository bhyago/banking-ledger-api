import type { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const transferSchemaValidation = {
  body: z.object({
    fromAccountId: z
      .string()
      .describe('Identificador ULID da conta de origem.'),
    toAccountId: z.string().describe('Identificador ULID da conta de destino.'),
    amount: z
      .number()
      .positive()
      .describe('Valor da transferência em unidades monetárias.'),
    description: z
      .string()
      .max(280)
      .optional()
      .describe('Descrição opcional da transferência.'),
  }),
  headers: z
    .object({
      'Idempotency-Key': z
        .string()
        .min(8)
        .describe('Chave para garantir idempotência da requisição.'),
    })
    .passthrough(),
  response: z.object({
    transferId: z.string().describe('Identificador da transferência gerada.'),
    fromAccountId: z.string().describe('Identificador da conta de origem.'),
    toAccountId: z.string().describe('Identificador da conta de destino.'),
    fromNewBalance: z.number().describe('Novo saldo da conta de origem.'),
    toNewBalance: z.number().describe('Novo saldo da conta de destino.'),
    feeApplied: z.number().describe('Taxa aplicada na transferência.'),
  }),
} satisfies SchemaValidation;

type TransferBody = z.infer<typeof transferSchemaValidation.body>;

export namespace transferDTO {
  export class TransferBodyDTO implements TransferBody {
    @ApiProperty({
      description: 'Conta de origem',
      example: '01J9MZ3ZYK2J4TN2YCE2V7ZVB8',
    })
    fromAccountId!: string;
    @ApiProperty({
      description: 'Conta de destino',
      example: '01J9N0AE7VQ2S6X7Y9Z8P1Q2R3',
    })
    toAccountId!: string;
    @ApiProperty({ description: 'Valor da transferência', example: 120.0 })
    amount!: number;
    @ApiProperty({
      required: false,
      description: 'Descrição opcional',
      example: 'Pagamento de serviço',
    })
    description?: string;
  }
  export class TransferInput extends createZodDto(
    transferSchemaValidation.body,
  ) {}
  export class TransferOutput extends createZodDto(
    transferSchemaValidation.response,
  ) {}
}
