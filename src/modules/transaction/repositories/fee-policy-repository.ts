import type { FeePolicy } from '../entities/fee-policy';
import type { TransactionType } from '../entities/enums';
import type { UnitOfWorkTx } from '@/common/uow';

export abstract class FeePolicyRepository {
  abstract findActiveByType(
    input: { transactionType: TransactionType; at: Date },
    tx?: UnitOfWorkTx,
  ): Promise<FeePolicy | null>;
}
