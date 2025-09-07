import { SchemaValidation } from '@/common/schema-validation-type';
import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getAccountByIdSchemaValidation = {
  params: z.object({
    accountId: z.string(),
  }),
  response: z.object({
    id: z.string(),
    number: z.string(),
    balance: z.number().min(0).positive(),
    creditLimit: z.number().min(0).positive(),
  }),
} satisfies SchemaValidation;

type GetAccountByIdParams = z.infer<
  typeof getAccountByIdSchemaValidation.params
>;

export namespace getAccountByIdDTO {
  export class GetAccountByIdParamsDTO implements GetAccountByIdParams {
    @ApiProperty({ required: true })
    accountId!: string;
  }
  export class GetAccountByIdInput extends createZodDto(
    getAccountByIdSchemaValidation.params,
  ) {}
  export class GetAccountByIdOutput extends createZodDto(
    getAccountByIdSchemaValidation.response,
  ) {}
}
