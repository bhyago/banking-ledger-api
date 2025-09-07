import { Injectable } from '@nestjs/common';
import { UnitOfWork, UnitOfWorkTx, UNIT_OF_WORK } from '@/common/uow';
import { Inject } from '@nestjs/common';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { LedgerRepository } from '../repositories/ledger-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { FeePolicyRepository } from '../repositories/fee-policy-repository';
import { Transaction } from '../entities/transaction';
import { LedgerEntry } from '../entities/ledger-entry';
import { TransactionType } from '../entities/enums';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { transactionErrors } from '../errors/transaction-errors';

type BatchItem =
  | { type: 'DEPOSIT'; amount: number; description?: string }
  | { type: 'WITHDRAW'; amount: number; description?: string };

@Injectable()
export class ProcessBatchAccountTransactionsUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly accountLock: AccountLockService,
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly feePolicyRepository: FeePolicyRepository,
  ) {}

  async execute(input: { accountId: string; items: BatchItem[] }): Promise<{
    accountId: string;
    applied: number;
    finalBalance: number;
    results: Array<
      | {
          type: 'DEPOSIT';
          transactionId: string;
          accountId: string;
          newBalance: number;
        }
      | {
          type: 'WITHDRAW';
          transactionId: string;
          accountId: string;
          newBalance: number;
          feeApplied: number;
        }
    >;
  }> {
    return this.accountLock.withLocks([input.accountId], async () =>
      this.uow.run(async (tx: UnitOfWorkTx) => {
        const account = await this.accountRepository.findById(
          { accountId: input.accountId },
          tx,
        );
        if (!account) throw new accountErrors.AccountNotFoundError();

        const withdrawPolicy = await this.feePolicyRepository.findActiveByType(
          { transactionType: TransactionType.WITHDRAW, at: new Date() },
          tx,
        );

        let runningBalance = account.balance;
        for (const it of input.items) {
          if (it.type === 'DEPOSIT') {
            runningBalance = runningBalance + it.amount;
          } else if (it.type === 'WITHDRAW') {
            const fee = withdrawPolicy
              ? withdrawPolicy.calculate(it.amount)
              : 0;
            const total = it.amount + fee;
            const available = runningBalance + account.creditLimit;
            if (available < total) {
              const rejected = Transaction.createRejected({
                accountId: account.id,
                type: TransactionType.WITHDRAW,
                amount: it.amount,
                fee,
                description: it.description,
              });
              await this.transactionRepository.create(rejected, tx);
              throw new transactionErrors.InsufficientFundsConsideringCreditLimitError();
            }
            runningBalance = runningBalance - total;
          }
        }

        let applied = 0;
        const results: any[] = [];
        runningBalance = account.balance;
        for (const it of input.items) {
          if (it.type === 'DEPOSIT') {
            const txEntity = Transaction.create({
              accountId: account.id,
              type: TransactionType.DEPOSIT,
              amount: it.amount,
              description: it.description,
            });
            await this.transactionRepository.create(txEntity, tx);
            runningBalance += it.amount;
            await this.ledgerRepository.append(
              LedgerEntry.create({
                accountId: account.id,
                transactionId: txEntity.id,
                transferId: null,
                debit: 0,
                credit: it.amount,
                balanceAfter: runningBalance,
              }),
              tx,
            );
            applied++;
            results.push({
              type: 'DEPOSIT',
              transactionId: txEntity.id.toValue(),
              accountId: account.id.toValue(),
              newBalance: runningBalance,
            });
          } else if (it.type === 'WITHDRAW') {
            const fee = withdrawPolicy
              ? withdrawPolicy.calculate(it.amount)
              : 0;
            const total = it.amount + fee;
            const txEntity = Transaction.create({
              accountId: account.id,
              type: TransactionType.WITHDRAW,
              amount: it.amount,
              fee,
              description: it.description,
            });
            await this.transactionRepository.create(txEntity, tx);
            runningBalance -= total;
            await this.ledgerRepository.append(
              LedgerEntry.create({
                accountId: account.id,
                transactionId: txEntity.id,
                transferId: null,
                debit: total,
                credit: 0,
                balanceAfter: runningBalance,
              }),
              tx,
            );
            applied++;
            results.push({
              type: 'WITHDRAW',
              transactionId: txEntity.id.toValue(),
              accountId: account.id.toValue(),
              newBalance: runningBalance,
              feeApplied: fee,
            });
          }
        }

        account.balance = runningBalance;
        await this.accountRepository.update(account, tx);

        return {
          accountId: input.accountId,
          applied,
          finalBalance: runningBalance,
          results,
        };
      }),
    );
  }
}
