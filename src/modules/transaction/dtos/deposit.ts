import type { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const depositSchemaValidation = {
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
    newBalance: z.number().min(0),
  }),
} satisfies SchemaValidation;

type DepositParams = z.infer<typeof depositSchemaValidation.params>;
type DepositBody = z.infer<typeof depositSchemaValidation.body>;

export namespace depositDTO {
  export class DepositParamsDTO implements DepositParams {
    @ApiProperty({ required: true })
    accountId!: string;
  }
  export class DepositBodyDTO implements DepositBody {
    @ApiProperty({ required: true })
    amount!: number;
    @ApiProperty({ required: false })
    description?: string;
  }
  export class DepositInput extends createZodDto(
    depositSchemaValidation.body.merge(depositSchemaValidation.params),
  ) {}
  export class DepositOutput extends createZodDto(
    depositSchemaValidation.response,
  ) {}
}
