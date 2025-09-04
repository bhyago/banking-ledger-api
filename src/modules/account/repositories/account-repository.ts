import { Account } from '../entities/account';

export abstract class AccountRepository {
  abstract save(input: Account): Promise<{ id: string }>;
  abstract findById(input: { accountId: string }): Promise<Account | null>;
  abstract findAccountLedger(input: {
    accountId: string;
  }): Promise<Account | null>;
}
