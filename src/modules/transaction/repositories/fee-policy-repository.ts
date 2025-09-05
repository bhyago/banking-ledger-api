import { FeePolicy } from '../entities/fee-policy';
import { TransactionType } from '../entities/enums';
import { UnitOfWorkTx } from '@/common/uow';

export abstract class FeePolicyRepository {
  abstract findActiveByType(
    input: { txType: TransactionType; at: Date },
    tx?: UnitOfWorkTx,
  ): Promise<FeePolicy | null>;
}
