import { createZodDto } from 'nestjs-zod';
import { z, ZodTypeAny } from 'zod';

type SchemaValidation<
  TBody extends ZodTypeAny = ZodTypeAny,
  TResponse extends ZodTypeAny = ZodTypeAny,
  THeaders extends ZodTypeAny = ZodTypeAny,
  TQueryParams extends ZodTypeAny = ZodTypeAny,
  TParams extends ZodTypeAny = ZodTypeAny,
> = {
  body?: TBody;
  response?: TResponse;
  headers?: THeaders;
  queryParams?: TQueryParams;
  params?: TParams;
};

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

export namespace getAccountByIdDTO {
  export class Input extends createZodDto(
    getAccountByIdSchemaValidation.params,
  ) {}
  export class Output extends createZodDto(
    getAccountByIdSchemaValidation.response,
  ) {}
}
