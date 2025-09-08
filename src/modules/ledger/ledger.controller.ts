import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorResponseDTO } from '@/infra/http/dtos/error-response';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  getAccountLedgerDTO,
  getAccountLedgerSchemaValidation,
} from './dtos/get-account-ledger';
import { GetAccountLedgerUseCase } from './usecases/get-account-ledger';

@ApiTags('ledger')
@Controller('accounts')
export class LedgerController {
  constructor(
    private readonly getAccountLedgerUseCase: GetAccountLedgerUseCase,
  ) {}

  @Get(':accountId/ledger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar lançamentos do razão da conta',
    description:
      'Retorna os lançamentos (razão) de uma conta com paginação e ordenação.',
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
  @ApiResponse({
    status: HttpStatus.OK,
    type: getAccountLedgerDTO.GetAccountLedgerOutput,
  })
  @ApiNotFoundResponse({
    description: 'Conta não encontrada',
    type: ErrorResponseDTO,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Falha de validação (params/query inválidos)',
    type: ErrorResponseDTO,
  })
  async getLedger(
    @Param(new ZodValidationPipe(getAccountLedgerSchemaValidation.params))
    param: getAccountLedgerDTO.GetAccountLedgerParamDTO,
    @Query(new ZodValidationPipe(getAccountLedgerSchemaValidation.queryParams))
    query: getAccountLedgerDTO.GetAccountLedgerQueryDTO,
  ): Promise<getAccountLedgerDTO.GetAccountLedgerOutput> {
    return this.getAccountLedgerUseCase.execute({
      accountId: param.accountId,
      page: query.page,
      perPage: query.perPage,
      order: query.order,
    });
  }
}
