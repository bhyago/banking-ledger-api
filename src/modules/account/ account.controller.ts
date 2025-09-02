import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { CreateAccountUseCase } from './usecases/create-account';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { createAccountDTO } from './dtos/create-account';

@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(private readonly createAccountUseCase: CreateAccountUseCase) {}

  @Post()
  @HttpCode(201)
  @ApiResponse({
    status: 201,
    type: createAccountDTO.Output,
  })
  createAccount(@Body() createAccountDTO: void) {
    return this.createAccountUseCase.execute();
  }
}
