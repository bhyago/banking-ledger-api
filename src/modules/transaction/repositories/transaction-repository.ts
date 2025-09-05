import { UnitOfWorkTx } from '@/common/uow';
import { Transaction } from '../entities/transaction';

export abstract class TransactionRepository {
  abstract create(
    input: Transaction,
    tx?: UnitOfWorkTx,
  ): Promise<{ id: string }>;
}
