import { FeePolicy } from '../entities/fee-policy';
import { TransactionType } from '../entities/enums';
import { UnitOfWorkTx } from '@/common/uow';

export abstract class FeePolicyRepository {
  abstract findActiveByType(
    input: { transactionType: TransactionType; at: Date },
    tx?: UnitOfWorkTx,
  ): Promise<FeePolicy | null>;
}
