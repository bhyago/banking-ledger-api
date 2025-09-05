import { Inject, Injectable } from '@nestjs/common';
import { UnitOfWork, UnitOfWorkTx, UNIT_OF_WORK } from '@/common/uow';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { Transaction } from '../entities/transaction';
import { TransactionType } from '../entities/enums';
import { LedgerEntry } from '../entities/ledger-entry';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { LedgerRepository } from '../repositories/ledger-repository';
import { FeePolicyRepository } from '../repositories/fee-policy-repository';
import { transactionErrors } from '../errors/transaction-errors';

@Injectable()
export class AccountTransactionService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly feePolicyRepository: FeePolicyRepository,
  ) {}

  async deposit(input: {
    accountId: string;
    amount: number;
    description?: string;
  }) {
    const amount = input.amount;
    return this.uow.run(async (tx: UnitOfWorkTx) => {
      const account = await this.accountRepository.findById(
        { accountId: input.accountId },
        tx,
      );
      if (!account) throw new accountErrors.AccountNotFoundError();

      const transactionEntity = Transaction.create({
        accountId: new UniqueEntityID(account.id.toValue()),
        type: TransactionType.DEPOSIT,
        amount,
        description: input.description,
      });

      const newBalance = account.balance + amount;

      await this.transactionRepository.create(transactionEntity, tx);
      await this.ledgerRepository.append(
        LedgerEntry.create({
          accountId: account.id,
          transactionId: transactionEntity.id,
          transferId: null,
          debit: 0,
          credit: amount,
          balanceAfter: newBalance,
        }),
        tx,
      );

      account.balance = newBalance;
      await this.accountRepository.update(account, tx);

      return {
        transactionId: transactionEntity.id.toValue(),
        accountId: account.id.toValue(),
        newBalance,
      };
    });
  }

  async withdraw(input: {
    accountId: string;
    amount: number;
    description?: string;
  }) {
    const amount = input.amount;
    return this.uow.run(async (tx: UnitOfWorkTx) => {
      const account = await this.accountRepository.findById(
        { accountId: input.accountId },
        tx,
      );
      if (!account) throw new accountErrors.AccountNotFoundError();

      const policy = await this.feePolicyRepository.findActiveByType(
        { txType: TransactionType.WITHDRAW, at: new Date() },
        tx,
      );
      const fee = policy ? policy.calculate(amount) : 0;
      const total = amount + fee;
      const available = account.balance + account.creditLimit;
      if (available < total)
        throw new transactionErrors.InsufficientFundsConsideringCreditLimitError();

      const txEntity = Transaction.create({
        accountId: account.id,
        type: TransactionType.WITHDRAW,
        amount,
        fee,
        description: input.description,
      });

      const newBalance = account.balance - total;
      await this.transactionRepository.create(txEntity, tx);
      await this.ledgerRepository.append(
        LedgerEntry.create({
          accountId: account.id,
          transactionId: txEntity.id,
          transferId: null,
          debit: total,
          credit: 0,
          balanceAfter: newBalance,
        }),
        tx,
      );
      account.balance = newBalance;
      await this.accountRepository.update(account, tx);

      return {
        transactionId: txEntity.id.toValue(),
        accountId: account.id.toValue(),
        newBalance,
        feeApplied: fee,
      };
    });
  }
}
