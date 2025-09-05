import { SchemaValidation } from '@/common/schema-validation-type';
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

type DepositParamsDTO = z.infer<typeof depositSchemaValidation.params>;
type DepositBodyDTO = z.infer<typeof depositSchemaValidation.body>;

export namespace depositDTO {
  export class ParamsDTO implements DepositParamsDTO {
    @ApiProperty({ required: true })
    accountId!: string;
  }
  export class BodyDTO implements DepositBodyDTO {
    @ApiProperty({ required: true })
    amount!: number;
    @ApiProperty({ required: false })
    description?: string;
  }
  export class Input extends createZodDto(
    depositSchemaValidation.body.merge(depositSchemaValidation.params),
  ) {}
  export class Output extends createZodDto(depositSchemaValidation.response) {}
}
