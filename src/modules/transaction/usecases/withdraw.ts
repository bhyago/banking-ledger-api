import { Injectable } from '@nestjs/common';
import { AccountTransactionService } from '../services/account-transaction.service';
import { withdrawDTO } from '../dtos/withdraw';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../async/messages';

@Injectable()
export class WithdrawUseCase {
  constructor(private readonly txService: AccountTransactionService) {}

  @OnEvent(QUEUES.withdraw, { async: true })
  async execute(
    input: withdrawDTO.Input | withdrawDTO.Input[],
  ): Promise<withdrawDTO.Output | withdrawDTO.Output[]> {
    const items = Array.isArray(input) ? input : [input];
    const results: withdrawDTO.Output[] = [];
    for (const it of items) {
      const result = await this.txService.withdraw({ ...it });
      results.push({
        transactionId: result.transactionId,
        accountId: result.accountId,
        newBalance: result.newBalance,
        feeApplied: result.feeApplied,
      });
    }
    return Array.isArray(input) ? results : results[0];
  }
}
