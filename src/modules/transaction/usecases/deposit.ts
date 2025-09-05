import { Injectable } from '@nestjs/common';
import { depositDTO } from '../dtos/deposit';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { Transaction } from '../entities/transaction';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { TransactionType } from '../entities/enums';
import { TransactionRepository } from '../repositories/transaction-repository';

@Injectable()
export class DepositUseCase {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: depositDTO.Input): Promise<depositDTO.Output> {
    const account = await this.accountRepository.findById({
      accountId: input.accountId,
    });
    if (!account) throw new accountErrors.AccountNotFoundError();

    const transactionEntity = Transaction.create({
      accountId: new UniqueEntityID(account.id.toValue()),
      type: TransactionType.DEPOSIT,
      amount: input.amount,
      description: input.description,
    });

    const newBalance = account.balance + input.amount;

    await this.transactionRepository.create(transactionEntity);

    return {
      transactionId: transactionEntity.id.toValue(),
      accountId: account.id.toValue(),
      newBalance,
    };
  }
}
