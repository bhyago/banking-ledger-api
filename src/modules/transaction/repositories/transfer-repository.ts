import type { Transfer } from '../entities/transfer';
import type { UnitOfWorkTx } from '@/common/uow';

export abstract class TransferRepository {
  abstract create(input: Transfer, tx?: UnitOfWorkTx): Promise<{ id: string }>;

  abstract findByIdempotencyKey(
    input: { idempotencyKey: string },
    tx?: UnitOfWorkTx,
  ): Promise<Transfer | null>;
}
