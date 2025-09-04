import { Controller, Post, HttpCode, Get, Param } from '@nestjs/common';
import { CreateAccountUseCase } from './usecases/create-account';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @HttpCode(201)
  @ApiResponse({
    status: 201,
    type: createAccountDTO.Output,
  })
  async createAccount(): Promise<createAccountDTO.Output> {
    return this.createAccountUseCase.execute();
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    type: getAccountByIdDTO.Output,
  })
  async getAccountById(
    @Param(new ZodValidationPipe(getAccountByIdSchemaValidation.params))
    param: getAccountByIdDTO.ParamsDTO,
  ): Promise<getAccountByIdDTO.Output> {
    return this.getAccountByIdUseCase.execute({ accountId: param.accountId });
  }
}
