import { Injectable } from '@nestjs/common';
import { depositDTO } from '../dtos/deposit';
import { AccountTransactionService } from '../services/account-transaction.service';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../async/messages';

@Injectable()
export class DepositUseCase {
  constructor(private readonly txService: AccountTransactionService) {}

  @OnEvent(QUEUES.deposit, { async: true })
  async execute(
    input: depositDTO.Input | depositDTO.Input[],
  ): Promise<depositDTO.Output | depositDTO.Output[]> {
    const items = Array.isArray(input) ? input : [input];
    const results: depositDTO.Output[] = [];
    for (const it of items) {
      const anyIt: any = it as any;
      const result = await this.txService.deposit({
        ...it,
        idempotencyKey: anyIt.id ?? anyIt.idempotencyKey,
      });
      results.push({
        transactionId: result.transactionId,
        accountId: result.accountId,
        newBalance: result.newBalance,
      });
    }
    return Array.isArray(input) ? results : results[0];
  }
}
