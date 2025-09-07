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
import {
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiHeader,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiOkResponse,
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorResponseDTO } from '@/infra/http/dtos/error-response';
import { ZodValidationPipe } from 'nestjs-zod';
import { depositDTO, depositSchemaValidation } from './dtos/deposit';
import { withdrawDTO, withdrawSchemaValidation } from './dtos/withdraw';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { randomUUID } from 'crypto';
import { QUEUES } from './async/messages';
import {
  getAccountTransactionsDTO,
  getAccountTransactionsSchemaValidation,
} from './dtos/get-account-transactions';
import { GetAccountTransactionsUseCase } from './usecases/get-account-transactions';

@ApiTags('transactions')
@Controller('transactions/:accountId')
export class TransactionController {
  constructor(
    private readonly queueSender: SendMessageToQueueProvider,
    private readonly getAccountTransactionsUseCase: GetAccountTransactionsUseCase,
  ) {}

  @Post('deposit')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Depositar',
    description: 'Enfileira um depósito para processamento assíncrono.',
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
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Chave para garantir idempotência da operação.',
    example: 'c0a8016e-6d53-4a9b-9d3f-0b2a4c5f2a11',
  })
  @ApiAcceptedResponse({
    description: 'Solicitação enfileirada',
    type: depositDTO.DepositOutput,
  })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação',
    type: ErrorResponseDTO,
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
  @ApiOperation({
    summary: 'Sacar',
    description: 'Enfileira um saque para processamento assíncrono.',
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
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Chave para garantir idempotência da operação.',
    example: 'b6f1a7f8-1a13-4d68-8a9f-9e4caef92af0',
  })
  @ApiAcceptedResponse({
    description: 'Solicitação enfileirada',
    type: withdrawDTO.WithdrawOutput,
  })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação ou saldo insuficiente',
    type: ErrorResponseDTO,
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
  @ApiOperation({
    summary: 'Listar transações',
    description: 'Lista transações da conta com paginação e filtros.',
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página (>= 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Itens por página (1-100)',
    example: 20,
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: 'Ordenação por data',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtra por status',
    enum: ['PENDING', 'APPLIED', 'REJECTED'],
  })
  @ApiOkResponse({
    description: 'Lista recuperada com sucesso',
    type: getAccountTransactionsDTO.GetAccountTransactionsOutput,
  })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação',
    type: ErrorResponseDTO,
  })
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
