import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Get,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { depositDTO, depositSchemaValidation } from './dtos/deposit';
import { withdrawDTO, withdrawSchemaValidation } from './dtos/withdraw';
import type { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { randomUUID } from 'crypto';
import { QUEUES } from './async/messages';
import {
  type getAccountTransactionsDTO,
  getAccountTransactionsSchemaValidation,
} from './dtos/get-account-transactions';
import type { GetAccountTransactionsUseCase } from './usecases/get-account-transactions';

@ApiTags('transactions')
@Controller('transactions/:accountId')
export class TransactionController {
  constructor(
    private readonly queueSender: SendMessageToQueueProvider,
    private readonly getAccountTransactionsUseCase: GetAccountTransactionsUseCase,
  ) {}

  @Post('deposit')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: depositDTO.DepositOutput,
  })
  async deposit(
    @Param(new ZodValidationPipe(depositSchemaValidation.params))
    param: depositDTO.DepositParamsDTO,
    @Body(new ZodValidationPipe(depositSchemaValidation.body))
    body: depositDTO.DepositBodyDTO,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<{ queued: true; id: string; queuedAt: Date }> {
    const id = idempotencyKey || randomUUID();
    await this.queueSender.execute({
      queueName: QUEUES.deposit,
      object: {
        id,
        accountId: param.accountId,
        amount: body.amount,
        description: body.description,
      },
    });
    return { queued: true, id, queuedAt: new Date() };
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: withdrawDTO.WithdrawOutput,
  })
  async withdraw(
    @Param(new ZodValidationPipe(withdrawSchemaValidation.params))
    param: withdrawDTO.WithdrawParamsDTO,
    @Body(new ZodValidationPipe(withdrawSchemaValidation.body))
    body: withdrawDTO.WithdrawBodyDTO,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<{ queued: true; id: string; queuedAt: Date }> {
    const id = idempotencyKey || randomUUID();
    await this.queueSender.execute({
      queueName: QUEUES.withdraw,
      object: {
        id,
        accountId: param.accountId,
        amount: body.amount,
        description: body.description,
      },
    });
    return { queued: true, id, queuedAt: new Date() };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK })
  async listTransactions(
    @Param(new ZodValidationPipe(getAccountTransactionsSchemaValidation.params))
    param: getAccountTransactionsDTO.GetAccountTransactionsParams,
    @Query(
      new ZodValidationPipe(getAccountTransactionsSchemaValidation.queryParams),
    )
    query: getAccountTransactionsDTO.GetAccountTransactionsQuery,
  ): Promise<getAccountTransactionsDTO.GetAccountTransactionsOutput> {
    return this.getAccountTransactionsUseCase.execute({
      accountId: param.accountId,
      page: (query as any).page,
      perPage: (query as any).perPage,
      order: (query as any).order,
      status: (query as any).status,
    } as any);
  }
}
