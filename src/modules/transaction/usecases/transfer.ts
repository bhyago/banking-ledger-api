import { Injectable } from '@nestjs/common';
import { AccountTransactionService } from '../services/account-transaction.service';
import { transferDTO } from '../dtos/transfer';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../async/messages';

@Injectable()
export class TransferUseCase {
  constructor(private readonly txService: AccountTransactionService) {}

  @OnEvent(QUEUES.transfer, { async: true })
  async execute(
    input: transferDTO.TransferInput | transferDTO.TransferInput[],
  ): Promise<transferDTO.TransferOutput | transferDTO.TransferOutput[]> {
    const items = Array.isArray(input) ? input : [input];
    const results: transferDTO.TransferOutput[] = [];
    for (const it of items) {
      const anyIt: any = it as any;
      const result = await this.txService.transfer({
        fromAccountId: it.fromAccountId,
        toAccountId: it.toAccountId,
        amount: it.amount,
        description: it.description,
        idempotencyKey: anyIt.idempotencyKey ?? anyIt.id,
      });
      results.push({
        transferId: result.transferId,
        fromAccountId: result.fromAccountId,
        toAccountId: result.toAccountId,
        fromNewBalance: result.fromNewBalance,
        toNewBalance: result.toNewBalance,
        feeApplied: result.feeApplied,
      });
    }
    return Array.isArray(input) ? results : results[0];
  }
}
