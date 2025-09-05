import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { depositDTO, depositSchemaValidation } from './dtos/deposit';
import { DepositUseCase } from './usecases/deposit';

@ApiTags('transactions')
@Controller('transactions/:accountId')
export class TransactionController {
  constructor(private readonly depositUseCase: DepositUseCase) {}

  @Post('deposits')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: depositDTO.Output })
  async deposit(
    @Param(new ZodValidationPipe(depositSchemaValidation.params))
    param: depositDTO.ParamsDTO,
    @Body(new ZodValidationPipe(depositSchemaValidation.body))
    body: depositDTO.BodyDTO,
  ): Promise<depositDTO.Output> {
    return this.depositUseCase.execute({
      accountId: param.accountId,
      amount: body.amount,
      description: body.description ?? undefined,
    });
  }
}
