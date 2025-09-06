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
import { TransferRepository } from '../repositories/transfer-repository';
import { Transfer } from '../entities/transfer';
function isUniqueError(e: any) {
  const msg = String(e?.message || '');
  return e?.code === 'P2002' || /unique|duplicate/i.test(msg);
}

@Injectable()
export class AccountTransactionService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly feePolicyRepository: FeePolicyRepository,
    private readonly transferRepository: TransferRepository,
  ) {}

  async deposit(input: {
    accountId: string;
    amount: number;
    description?: string;
    idempotencyKey: string;
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
        idempotencyKey: input.idempotencyKey,
      });

      const newBalance = account.balance + amount;

      try {
        await this.transactionRepository.create(transactionEntity, tx);
      } catch (e) {
        if (isUniqueError(e)) {
          return {
            transactionId: 'idempotent',
            accountId: account.id.toValue(),
            newBalance: account.balance,
          };
        }
        throw e;
      }
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

      const out = {
        transactionId: transactionEntity.id.toValue(),
        accountId: account.id.toValue(),
        newBalance,
      };
      return out;
    });
  }

  async withdraw(input: {
    accountId: string;
    amount: number;
    description?: string;
    idempotencyKey: string;
  }) {
    const amount = input.amount;
    return this.uow.run(async (tx: UnitOfWorkTx) => {
      const account = await this.accountRepository.findById(
        { accountId: input.accountId },
        tx,
      );
      if (!account) throw new accountErrors.AccountNotFoundError();

      const policy = await this.feePolicyRepository.findActiveByType(
        { transactionType: TransactionType.WITHDRAW, at: new Date() },
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
        idempotencyKey: input.idempotencyKey,
      });

      const newBalance = account.balance - total;
      try {
        await this.transactionRepository.create(txEntity, tx);
      } catch (e) {
        if (isUniqueError(e)) {
          return {
            transactionId: 'idempotent',
            accountId: account.id.toValue(),
            newBalance: account.balance,
            feeApplied: 0,
          };
        }
        throw e;
      }
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

      const out = {
        transactionId: txEntity.id.toValue(),
        accountId: account.id.toValue(),
        newBalance,
        feeApplied: fee,
      };
      return out;
    });
  }

  async transfer(input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    idempotencyKey: string;
  }) {
    if (input.fromAccountId === input.toAccountId)
      throw new transactionErrors.TransferAccountsMustDifferError();

    const amount = input.amount;
    return this.uow.run(async (tx: UnitOfWorkTx) => {
      const [from, to] = await Promise.all([
        this.accountRepository.findById({ accountId: input.fromAccountId }, tx),
        this.accountRepository.findById({ accountId: input.toAccountId }, tx),
      ]);
      if (!from || !to) throw new accountErrors.AccountNotFoundError();

      const policy = await this.feePolicyRepository.findActiveByType(
        { transactionType: TransactionType.TRANSFER, at: new Date() },
        tx,
      );
      const fee = policy ? policy.calculate(amount) : 0;
      const total = amount + fee;
      const available = from.balance + from.creditLimit;
      if (available < total)
        throw new transactionErrors.InsufficientFundsConsideringCreditLimitError();

      const transfer = Transfer.create({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount,
        feeFrom: fee,
        idempotencyKey: input.idempotencyKey,
      });
      try {
        await this.transferRepository.create(transfer, tx);
      } catch (e) {
        if (isUniqueError(e)) {
          return {
            transferId: 'idempotent',
            fromAccountId: from.id.toValue(),
            toAccountId: to.id.toValue(),
            fromNewBalance: from.balance,
            toNewBalance: to.balance,
            feeApplied: 0,
          };
        }
        throw e;
      }

      const transactionFrom = Transaction.create({
        accountId: from.id,
        type: TransactionType.TRANSFER,
        amount,
        fee,
        description: input.description,
        relatedAccountId: to.id,
        transferId: transfer.id,
      });
      const transactionTo = Transaction.create({
        accountId: to.id,
        type: TransactionType.TRANSFER,
        amount,
        fee: 0,
        description: input.description,
        relatedAccountId: from.id,
        transferId: transfer.id,
      });

      const fromNewBalance = from.balance - total;
      const toNewBalance = to.balance + amount;

      await this.transactionRepository.create(transactionFrom, tx);
      await this.transactionRepository.create(transactionTo, tx);

      await this.ledgerRepository.append(
        LedgerEntry.create({
          accountId: from.id,
          transactionId: transactionFrom.id,
          transferId: transfer.id,
          debit: total,
          credit: 0,
          balanceAfter: fromNewBalance,
        }),
        tx,
      );
      await this.ledgerRepository.append(
        LedgerEntry.create({
          accountId: to.id,
          transactionId: transactionTo.id,
          transferId: transfer.id,
          debit: 0,
          credit: amount,
          balanceAfter: toNewBalance,
        }),
        tx,
      );

      from.balance = fromNewBalance;
      to.balance = toNewBalance;
      await Promise.all([
        this.accountRepository.update(from, tx),
        this.accountRepository.update(to, tx),
      ]);

      const out = {
        transferId: transfer.id.toValue(),
        fromAccountId: from.id.toValue(),
        toAccountId: to.id.toValue(),
        fromNewBalance: fromNewBalance,
        toNewBalance: toNewBalance,
        feeApplied: fee,
      };
      return out;
    });
  }
}
