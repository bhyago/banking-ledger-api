import {
  Controller,
  Post,
  HttpCode,
  Get,
  Param,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { CreateAccountUseCase } from './usecases/create-account';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { createAccountDTO } from './dtos/create-account';
import {
  getAccountByIdDTO,
  getAccountByIdSchemaValidation,
} from './dtos/get-account-by-id';
import { GetAccountByIdUseCase } from './usecases/get-account-by-id';
import { ZodValidationPipe } from 'nestjs-zod';

@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar conta',
    description: 'Cria uma nova conta e retorna seu identificador.',
  })
  @ApiCreatedResponse({
    description: 'Conta criada com sucesso',
    type: createAccountDTO.CreateAccountOutput,
  })
  async createAccount(
    @Body(new ZodValidationPipe(createAccountDTO.CreateAccountInput))
    body: createAccountDTO.CreateAccountInput,
  ): Promise<createAccountDTO.CreateAccountOutput> {
    return this.createAccountUseCase.execute(body);
  }

  @Get(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar conta por ID',
    description: 'Recupera os dados de uma conta existente pelo seu ID.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Identificador ULID da conta.',
    required: true,
    example: '01J9MZ3ZYK2J4TN2YCE2V7ZVB8',
    schema: {
      type: 'string',
      format: 'ulid',
      pattern: '^[0-9A-HJKMNP-TV-Z]{26}$',
    },
  })
  @ApiOkResponse({
    description: 'Conta encontrada com sucesso',
    type: getAccountByIdDTO.GetAccountByIdOutput,
  })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'AccountNotFoundError' },
        message: { type: 'string', example: 'Account not found' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação (ex.: ULID inválido)',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'ZodValidationException' },
        message: { type: 'string', example: 'Validation failed' },
      },
    },
  })
  async getAccountById(
    @Param(new ZodValidationPipe(getAccountByIdSchemaValidation.params))
    param: getAccountByIdDTO.GetAccountByIdParamsDTO,
  ): Promise<getAccountByIdDTO.GetAccountByIdOutput> {
    return this.getAccountByIdUseCase.execute({ accountId: param.accountId });
  }
}
