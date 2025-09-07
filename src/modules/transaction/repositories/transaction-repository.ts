import type { UnitOfWorkTx } from '@/common/uow';
import type { Transaction } from '../entities/transaction';

export abstract class TransactionRepository {
  abstract create(
    input: Transaction,
    tx?: UnitOfWorkTx,
  ): Promise<{ id: string }>;

  abstract findByTypeAndIdempotencyKey(
    input: { type: any; idempotencyKey: string },
    tx?: UnitOfWorkTx,
  ): Promise<Transaction | null>;
}
