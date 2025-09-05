import { UnitOfWorkTx } from '@/common/uow';
import { Account } from '../entities/account';

export abstract class AccountRepository {
  abstract save(input: Account): Promise<{ id: string }>;
  abstract findById(
    input: { accountId: string },
    tx?: UnitOfWorkTx,
  ): Promise<Account | null>;
  abstract update(input: Account, tx?: UnitOfWorkTx): Promise<void>;
}
