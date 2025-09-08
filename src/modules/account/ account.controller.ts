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
import { ErrorResponseDTO } from '@/infra/http/dtos/error-response';
import { createAccountDTO } from './dtos/create-account';
import {
  getAccountByIdDTO,
  getAccountByIdSchemaValidation,
} from './dtos/get-account-by-id';
import { GetAccountByIdUseCase } from './usecases/get-account-by-id';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  updateAccountDTO,
  updateAccountSchemaValidation,
} from './dtos/update-account';
import { UpdateAccountUseCase } from './usecases/update-account';

@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
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
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação',
    type: ErrorResponseDTO,
  })
  async createAccount(
    @Body(new ZodValidationPipe(createAccountDTO.CreateAccountInput))
    body: createAccountDTO.CreateAccountInput,
  ): Promise<createAccountDTO.CreateAccountOutput> {
    return this.createAccountUseCase.execute(body);
  }

  @Post(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar dados da conta (fullName/cpf/creditLimit)',
  })
  @ApiParam({ name: 'accountId', required: true })
  @ApiOkResponse({ description: 'Conta atualizada' })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação',
    type: ErrorResponseDTO,
  })
  async updateAccount(
    @Param(new ZodValidationPipe(updateAccountSchemaValidation.params))
    params: updateAccountDTO.UpdateAccountParams,
    @Body(new ZodValidationPipe(updateAccountSchemaValidation.body))
    body: updateAccountDTO.UpdateAccountBody,
  ): Promise<updateAccountDTO.UpdateAccountOutput> {
    const updated = await this.updateAccountUseCase.execute({
      accountId: params.accountId,
      fullName: body.fullName,
      cpf: body.cpf,
      creditLimit: (body as any).creditLimit,
    });
    return updated as any;
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
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação (ex.: ULID inválido)',
    type: ErrorResponseDTO,
  })
  async getAccountById(
    @Param(new ZodValidationPipe(getAccountByIdSchemaValidation.params))
    param: getAccountByIdDTO.GetAccountByIdParamsDTO,
  ): Promise<getAccountByIdDTO.GetAccountByIdOutput> {
    return this.getAccountByIdUseCase.execute({ accountId: param.accountId });
  }
}
