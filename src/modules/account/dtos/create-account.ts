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

export const createAccountSchemaValidation = {
  response: z.object({
    accountId: z.string(),
  }),
} satisfies SchemaValidation;

export namespace createAccountDTO {
  export class Output extends createZodDto(
    createAccountSchemaValidation.response,
  ) {}
}
