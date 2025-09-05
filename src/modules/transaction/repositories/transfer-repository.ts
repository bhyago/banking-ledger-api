import { Transfer } from '../entities/transfer';
import { UnitOfWorkTx } from '@/common/uow';

export abstract class TransferRepository {
  abstract create(input: Transfer, tx?: UnitOfWorkTx): Promise<{ id: string }>;
}
