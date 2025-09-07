import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAccountSchemaValidation = {
  body: z.object({
    creditLimit: z.number().min(0).optional(),
  }),
  response: z.object({
    accountId: z.string(),
  }),
} satisfies SchemaValidation;

export namespace createAccountDTO {
  export class CreateAccountInput extends createZodDto(
    createAccountSchemaValidation.body,
  ) {}
  export class CreateAccountOutput extends createZodDto(
    createAccountSchemaValidation.response,
  ) {}
}
