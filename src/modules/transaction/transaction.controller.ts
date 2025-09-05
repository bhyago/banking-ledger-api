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
import { withdrawDTO, withdrawSchemaValidation } from './dtos/withdraw';
import { WithdrawUseCase } from './usecases/withdraw';

@ApiTags('transactions')
@Controller('transactions/:accountId')
export class TransactionController {
  constructor(
    private readonly depositUseCase: DepositUseCase,
    private readonly withdrawUseCase: WithdrawUseCase,
  ) {}

  @Post('deposit')
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

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: withdrawDTO.Output })
  async withdraw(
    @Param(new ZodValidationPipe(withdrawSchemaValidation.params))
    param: withdrawDTO.ParamsDTO,
    @Body(new ZodValidationPipe(withdrawSchemaValidation.body))
    body: withdrawDTO.BodyDTO,
  ): Promise<withdrawDTO.Output> {
    return this.withdrawUseCase.execute({
      accountId: param.accountId,
      amount: body.amount,
      description: body.description ?? undefined,
    });
  }
}
