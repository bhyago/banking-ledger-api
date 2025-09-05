import { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const transferSchemaValidation = {
  body: z.object({
    fromAccountId: z.string(),
    toAccountId: z.string(),
    amount: z.number().positive(),
    description: z.string().max(280).optional(),
  }),
  headers: z
    .object({
      'Idempotency-Key': z.string().min(8),
    })
    .passthrough(),
  response: z.object({
    transferId: z.string(),
    fromAccountId: z.string(),
    toAccountId: z.string(),
    fromNewBalance: z.number(),
    toNewBalance: z.number(),
    feeApplied: z.number(),
  }),
} satisfies SchemaValidation;

type TransferBodyDTO = z.infer<typeof transferSchemaValidation.body>;

export namespace transferDTO {
  export class BodyDTO implements TransferBodyDTO {
    @ApiProperty()
    fromAccountId!: string;
    @ApiProperty()
    toAccountId!: string;
    @ApiProperty()
    amount!: number;
    @ApiProperty({ required: false })
    description?: string;
  }
  export class Input extends createZodDto(transferSchemaValidation.body) {}
  export class Output extends createZodDto(transferSchemaValidation.response) {}
}
