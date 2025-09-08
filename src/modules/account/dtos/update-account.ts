import type { SchemaValidation } from '@/common/schema-validation-type';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateAccountSchemaValidation = {
  params: z.object({
    accountId: z.string().ulid(),
  }),
  body: z.object({
    fullName: z.string().min(3).max(120).optional(),
    cpf: z
      .string()
      .regex(/^\d{11}$/)
      .optional(),
    creditLimit: z.number().min(0).optional(),
  }),
  response: z.object({
    accountId: z.string().ulid(),
    fullName: z.string().nullable(),
    cpf: z.string().nullable(),
    creditLimit: z.number(),
  }),
} satisfies SchemaValidation;

export namespace updateAccountDTO {
  export class UpdateAccountParams extends createZodDto(
    updateAccountSchemaValidation.params,
  ) {}
  export class UpdateAccountBody extends createZodDto(
    updateAccountSchemaValidation.body,
  ) {}
  export class UpdateAccountInput extends createZodDto(
    updateAccountSchemaValidation.body.merge(
      updateAccountSchemaValidation.params,
    ),
  ) {}
  export class UpdateAccountOutput extends createZodDto(
    updateAccountSchemaValidation.response,
  ) {}
}
