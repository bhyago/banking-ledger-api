import { Injectable } from '@nestjs/common';
import type { transferDTO } from '../dtos/transfer';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../async/messages';
import { ProcessBatchTransfersUseCase } from './process-batch-transfers';

@Injectable()
export class TransferUseCase {
  constructor(private readonly batchTransfers: ProcessBatchTransfersUseCase) {}

  @OnEvent(QUEUES.transfer, { async: true })
  async execute(
    input: transferDTO.TransferInput | transferDTO.TransferInput[],
  ): Promise<transferDTO.TransferOutput | transferDTO.TransferOutput[]> {
    const items = Array.isArray(input) ? input : [input];
    const groups = new Map<string, transferDTO.TransferInput[]>();
    for (const it of items) {
      const key = `${it.fromAccountId}::${it.toAccountId}`;
      const list = groups.get(key) ?? [];
      list.push(it as any);
      groups.set(key, list);
    }

    const outputs: transferDTO.TransferOutput[] = [];
    for (const [key, group] of groups.entries()) {
      const fromAccountId = group[0].fromAccountId;
      const toAccountId = group[0].toAccountId;
      const batch = await this.batchTransfers.execute({
        fromAccountId,
        toAccountId,
        items: group.map((g) => {
          const anyG: any = g as any;
          return {
            amount: g.amount,
            description: g.description,
            idempotencyKey: anyG.idempotencyKey ?? anyG.id,
          };
        }),
      });
      for (const r of batch.results) {
        outputs.push({
          transferId: r.transferId,
          fromAccountId: r.fromAccountId,
          toAccountId: r.toAccountId,
          fromNewBalance: r.fromNewBalance,
          toNewBalance: r.toNewBalance,
          feeApplied: r.feeApplied,
        } as any);
      }
    }
    return Array.isArray(input) ? outputs : outputs[0];
  }
}
