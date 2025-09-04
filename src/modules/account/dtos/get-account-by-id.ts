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

type GetAccountByIdParamsDTO = z.infer<
  typeof getAccountByIdSchemaValidation.params
>;

export namespace getAccountByIdDTO {
  export class ParamsDTO implements GetAccountByIdParamsDTO {
    @ApiProperty({ required: true })
    accountId!: string;
  }
  export class Input extends createZodDto(
    getAccountByIdSchemaValidation.params,
  ) {}
  export class Output extends createZodDto(
    getAccountByIdSchemaValidation.response,
  ) {}
}
