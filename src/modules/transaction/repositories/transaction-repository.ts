import { Transaction } from '../entities/transaction';

export abstract class TransactionRepository {
  abstract create(input: Transaction): Promise<{ id: string }>;
}
