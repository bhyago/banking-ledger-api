import { Injectable } from '@nestjs/common';
import type { depositDTO } from '../dtos/deposit';
import type { AccountTransactionService } from '../services/account-transaction.service';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../async/messages';
import type { ProcessBatchAccountTransactionsUseCase } from './process-batch-account-transactions';

@Injectable()
export class DepositUseCase {
  constructor(
    private readonly txService: AccountTransactionService,
    private readonly batchUseCase: ProcessBatchAccountTransactionsUseCase,
  ) {}

  @OnEvent(QUEUES.deposit, { async: true })
  async execute(
    input: depositDTO.DepositInput | depositDTO.DepositInput[],
  ): Promise<depositDTO.DepositOutput | depositDTO.DepositOutput[]> {
    const items = Array.isArray(input) ? input : [input];
    const groups = new Map<string, depositDTO.DepositInput[]>();
    for (const it of items) {
      const list = groups.get(it.accountId) ?? [];
      list.push(it as any);
      groups.set(it.accountId, list);
    }

    const outputs: depositDTO.DepositOutput[] = [];
    for (const [accountId, group] of groups.entries()) {
      const batch = await this.batchUseCase.execute({
        accountId,
        items: group.map((g) => ({
          type: 'DEPOSIT' as const,
          amount: g.amount,
          description: g.description,
        })),
      });
      for (const r of batch.results) {
        if (r.type === 'DEPOSIT') {
          outputs.push({
            transactionId: r.transactionId,
            accountId: r.accountId,
            newBalance: r.newBalance,
          } as any);
        }
      }
    }
    return Array.isArray(input) ? outputs : outputs[0];
  }
}
