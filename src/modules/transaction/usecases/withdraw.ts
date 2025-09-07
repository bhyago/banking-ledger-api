import { Injectable } from '@nestjs/common';
import { AccountTransactionService } from '../services/account-transaction.service';
import { withdrawDTO } from '../dtos/withdraw';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../async/messages';
import { ProcessBatchAccountTransactionsUseCase } from './process-batch-account-transactions';

@Injectable()
export class WithdrawUseCase {
  constructor(
    private readonly txService: AccountTransactionService,
    private readonly batchUseCase: ProcessBatchAccountTransactionsUseCase,
  ) {}

  @OnEvent(QUEUES.withdraw, { async: true })
  async execute(
    input: withdrawDTO.WithdrawInput | withdrawDTO.WithdrawInput[],
  ): Promise<withdrawDTO.WithdrawOutput | withdrawDTO.WithdrawOutput[]> {
    const items = Array.isArray(input) ? input : [input];
    const groups = new Map<string, withdrawDTO.WithdrawInput[]>();
    for (const it of items) {
      const list = groups.get(it.accountId) ?? [];
      list.push(it as any);
      groups.set(it.accountId, list);
    }

    const outputs: withdrawDTO.WithdrawOutput[] = [];
    for (const [accountId, group] of groups.entries()) {
      const batch = await this.batchUseCase.execute({
        accountId,
        items: group.map((g) => ({
          type: 'WITHDRAW' as const,
          amount: g.amount,
          description: g.description,
        })),
      });
      for (const r of batch.results) {
        if (r.type === 'WITHDRAW') {
          outputs.push({
            transactionId: r.transactionId,
            accountId: r.accountId,
            newBalance: r.newBalance,
            feeApplied: r.feeApplied,
          } as any);
        }
      }
    }
    return Array.isArray(input) ? outputs : outputs[0];
  }
}
