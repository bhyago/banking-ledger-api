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

type WithdrawParamsDTO = z.infer<typeof withdrawSchemaValidation.params>;
type WithdrawBodyDTO = z.infer<typeof withdrawSchemaValidation.body>;

export namespace withdrawDTO {
  export class ParamsDTO implements WithdrawParamsDTO {
    @ApiProperty({ required: true })
    accountId!: string;
  }
  export class BodyDTO implements WithdrawBodyDTO {
    @ApiProperty({ required: true })
    amount!: number;
    @ApiProperty({ required: false })
    description?: string;
  }

  export class Input extends createZodDto(
    withdrawSchemaValidation.body.merge(withdrawSchemaValidation.params),
  ) {}

  export class Output extends createZodDto(withdrawSchemaValidation.response) {}
}
