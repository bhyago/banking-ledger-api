import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiResponse({ status: HttpStatus.OK, type: getAccountLedgerDTO.Output })
  async getLedger(
    @Param(new ZodValidationPipe(getAccountLedgerSchemaValidation.params))
    param: getAccountLedgerDTO.Input,
    @Query(new ZodValidationPipe(getAccountLedgerSchemaValidation.queryParams))
    query: getAccountLedgerDTO.QueryDTO,
  ): Promise<getAccountLedgerDTO.Output> {
    return this.getAccountLedgerUseCase.execute({
      accountId: param.accountId,
      page: query.page,
      perPage: query.perPage,
      order: query.order,
    });
  }
}
