import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { depositDTO, depositSchemaValidation } from './dtos/deposit';
import { withdrawDTO, withdrawSchemaValidation } from './dtos/withdraw';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { randomUUID } from 'crypto';
import { QUEUES } from './async/messages';

@ApiTags('transactions')
@Controller('transactions/:accountId')
export class TransactionController {
  constructor(private readonly queueSender: SendMessageToQueueProvider) {}

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
}
