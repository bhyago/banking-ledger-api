import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { transferDTO, transferSchemaValidation } from './dtos/transfer';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { QUEUES } from './async/messages';
import { randomUUID } from 'crypto';

@ApiTags('transfer')
@Controller('transfer')
export class TransferController {
  constructor(private readonly queueSender: SendMessageToQueueProvider) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  async transfer(
    @Body(new ZodValidationPipe(transferSchemaValidation.body))
    body: transferDTO.BodyDTO,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<{ queued: true; id: string; queuedAt: Date }> {
    const id = idempotencyKey || randomUUID();
    await this.queueSender.execute({
      queueName: QUEUES.transfer,
      object: {
        id,
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        amount: body.amount,
        description: body.description ?? undefined,
        idempotencyKey: idempotencyKey,
      },
    });
    return { queued: true, id, queuedAt: new Date() };
  }
}
