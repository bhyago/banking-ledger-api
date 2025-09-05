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
import { TransferUseCase } from './usecases/transfer';

@ApiTags('transfer')
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferUseCase: TransferUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.OK, type: transferDTO.Output })
  async transfer(
    @Body(new ZodValidationPipe(transferSchemaValidation.body))
    body: transferDTO.BodyDTO,
  ): Promise<transferDTO.Output> {
    return this.transferUseCase.execute({
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amount: body.amount,
      description: body.description ?? undefined,
    });
  }
}
