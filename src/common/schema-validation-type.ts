import { type ZodTypeAny } from 'zod';

export type SchemaValidation<
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
