import { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const withdrawSchemaValidation = {
  params: z.object({
    accountId: z.string(),
  }),
  body: z.object({
    amount: z.number().positive(),
    description: z.string().max(280).optional(),
  }),
  response: z.object({
    transactionId: z.string(),
    accountId: z.string(),
    newBalance: z.number(),
    feeApplied: z.number(),
  }),
} satisfies SchemaValidation;

type WithdrawParams = z.infer<typeof withdrawSchemaValidation.params>;
type WithdrawBody = z.infer<typeof withdrawSchemaValidation.body>;

export namespace withdrawDTO {
  export class WithdrawParamsDTO implements WithdrawParams {
    @ApiProperty({ required: true })
    accountId!: string;
  }
  export class WithdrawBodyDTO implements WithdrawBody {
    @ApiProperty({ required: true })
    amount!: number;
    @ApiProperty({ required: false })
    description?: string;
  }

  export class WithdrawInput extends createZodDto(
    withdrawSchemaValidation.body.merge(withdrawSchemaValidation.params),
  ) {}

  export class WithdrawOutput extends createZodDto(
    withdrawSchemaValidation.response,
  ) {}
}
