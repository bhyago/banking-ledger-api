import { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAccountSchemaValidation = {
  response: z.object({
    accountId: z.string(),
  }),
} satisfies SchemaValidation;

export namespace createAccountDTO {
  export class CreateAccountOutput extends createZodDto(
    createAccountSchemaValidation.response,
  ) {}
}
