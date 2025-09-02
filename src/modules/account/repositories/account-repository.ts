import { Account } from '../entities/account';

export abstract class AccountRepository {
  abstract save(input: Account): Promise<{ id: string }>;
}
