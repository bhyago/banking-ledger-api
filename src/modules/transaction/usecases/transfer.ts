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
    input: transferDTO.Input | transferDTO.Input[],
  ): Promise<transferDTO.Output | transferDTO.Output[]> {
    const items = Array.isArray(input) ? input : [input];
    const results: transferDTO.Output[] = [];
    for (const it of items) {
      const result = await this.txService.transfer({
        fromAccountId: it.fromAccountId,
        toAccountId: it.toAccountId,
        amount: it.amount,
        description: it.description,
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
