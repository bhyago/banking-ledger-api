import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDTO } from '@/infra/http/dtos/error-response';
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
  @ApiOperation({
    summary: 'Transferir',
    description: 'Enfileira uma transferência para processamento assíncrono.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Chave para garantir idempotência da operação.',
    example: '8d0a153e-2a5a-4c0b-89c7-9f3e4a2b1c77',
  })
  @ApiAcceptedResponse({
    description: 'Solicitação enfileirada',
    type: transferDTO.TransferOutput,
  })
  @ApiBadRequestResponse({
    description: 'Contas de origem e destino devem ser diferentes',
    type: ErrorResponseDTO,
  })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação ou saldo insuficiente',
    type: ErrorResponseDTO,
  })
  async transfer(
    @Body(new ZodValidationPipe(transferSchemaValidation.body))
    body: transferDTO.TransferBodyDTO,
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
