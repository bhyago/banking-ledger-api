import {
  Controller,
  Post,
  HttpCode,
  Get,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { CreateAccountUseCase } from './usecases/create-account';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
    type: createAccountDTO.Output,
  })
  async createAccount(): Promise<createAccountDTO.Output> {
    return this.createAccountUseCase.execute();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar conta por ID',
    description: 'Recupera os dados de uma conta existente pelo seu ID.',
  })
  async getAccountById(
    @Param(new ZodValidationPipe(getAccountByIdSchemaValidation.params))
    param: getAccountByIdDTO.ParamsDTO,
  ): Promise<getAccountByIdDTO.Output> {
    return this.getAccountByIdUseCase.execute({ accountId: param.accountId });
  }
}
