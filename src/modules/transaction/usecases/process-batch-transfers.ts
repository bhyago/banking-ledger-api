import { Inject, Injectable } from '@nestjs/common';
import type { AccountLockService } from '@/common/concurrency/account-lock.service';
import { type UnitOfWork, type UnitOfWorkTx, UNIT_OF_WORK } from '@/common/uow';
import type { AccountRepository } from '@/modules/account/repositories/account-repository';
import type { FeePolicyRepository } from '../repositories/fee-policy-repository';
import type { LedgerRepository } from '../repositories/ledger-repository';
import type { TransactionRepository } from '../repositories/transaction-repository';
import type { TransferRepository } from '../repositories/transfer-repository';
import { Transaction } from '../entities/transaction';
import { Transfer } from '../entities/transfer';
import { TransactionType } from '../entities/enums';
import { transactionErrors } from '../errors/transaction-errors';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { LedgerEntry } from '../entities/ledger-entry';

export interface BatchTransferItem {
  amount: number;
  description?: string;
  idempotencyKey: string;
}

@Injectable()
export class ProcessBatchTransfersUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly accountLock: AccountLockService,
    private readonly accountRepository: AccountRepository,
    private readonly feePolicyRepository: FeePolicyRepository,
    private readonly transferRepository: TransferRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  async execute(input: {
    fromAccountId: string;
    toAccountId: string;
    items: BatchTransferItem[];
  }): Promise<{
    fromAccountId: string;
    toAccountId: string;
    applied: number;
    results: Array<{
      transferId: string;
      fromAccountId: string;
      toAccountId: string;
      fromNewBalance: number;
      toNewBalance: number;
      feeApplied: number;
    }>;
  }> {
    if (input.fromAccountId === input.toAccountId)
      throw new transactionErrors.TransferAccountsMustDifferError();

    return this.accountLock.withLocks(
      [input.fromAccountId, input.toAccountId],
      async () =>
        this.uow.run(async (tx: UnitOfWorkTx) => {
          const [from, to] = await Promise.all([
            this.accountRepository.findById(
              { accountId: input.fromAccountId },
              tx,
            ),
            this.accountRepository.findById(
              { accountId: input.toAccountId },
              tx,
            ),
          ]);
          if (!from || !to) throw new accountErrors.AccountNotFoundError();

          // Resolve policy once per batch
          const transferPolicy =
            await this.feePolicyRepository.findActiveByType(
              { transactionType: TransactionType.TRANSFER, at: new Date() },
              tx,
            );

          let fromBalance = from.balance;
          let toBalance = to.balance;
          for (const it of input.items) {
            const fee = transferPolicy
              ? transferPolicy.calculate(it.amount)
              : 0;
            const total = it.amount + fee;
            const available = fromBalance + from.creditLimit;
            if (available < total) {
              const rejected = Transaction.createRejected({
                accountId: from.id,
                type: TransactionType.TRANSFER,
                amount: it.amount,
                fee,
                description: it.description,
                idempotencyKey: it.idempotencyKey,
              });
              await this.transactionRepository.create(rejected, tx);
              throw new transactionErrors.InsufficientFundsConsideringCreditLimitError();
            }
            fromBalance -= total;
            toBalance += it.amount;
          }

          const results: Array<{
            transferId: string;
            fromAccountId: string;
            toAccountId: string;
            fromNewBalance: number;
            toNewBalance: number;
            feeApplied: number;
          }> = [];
          fromBalance = from.balance;
          toBalance = to.balance;
          for (const it of input.items) {
            const fee = transferPolicy
              ? transferPolicy.calculate(it.amount)
              : 0;
            const total = it.amount + fee;

            const transfer = Transfer.create({
              fromAccountId: from.id,
              toAccountId: to.id,
              amount: it.amount,
              feeFrom: fee,
              idempotencyKey: it.idempotencyKey,
            });
            await this.transferRepository.create(transfer, tx);

            const txFrom = Transaction.create({
              accountId: from.id,
              type: TransactionType.TRANSFER,
              amount: it.amount,
              fee,
              description: it.description,
              relatedAccountId: to.id,
              transferId: transfer.id,
            });
            const txTo = Transaction.create({
              accountId: to.id,
              type: TransactionType.TRANSFER,
              amount: it.amount,
              fee: 0,
              description: it.description,
              relatedAccountId: from.id,
              transferId: transfer.id,
            });
            await this.transactionRepository.create(txFrom, tx);
            await this.transactionRepository.create(txTo, tx);

            fromBalance -= total;
            toBalance += it.amount;

            await this.ledgerRepository.append(
              LedgerEntry.create({
                accountId: from.id,
                transactionId: txFrom.id,
                transferId: transfer.id,
                debit: total,
                credit: 0,
                balanceAfter: fromBalance,
              }),
              tx,
            );
            await this.ledgerRepository.append(
              LedgerEntry.create({
                accountId: to.id,
                transactionId: txTo.id,
                transferId: transfer.id,
                debit: 0,
                credit: it.amount,
                balanceAfter: toBalance,
              }),
              tx,
            );

            results.push({
              transferId: transfer.id.toValue(),
              fromAccountId: from.id.toValue(),
              toAccountId: to.id.toValue(),
              fromNewBalance: fromBalance,
              toNewBalance: toBalance,
              feeApplied: fee,
            });
          }

          from.balance = fromBalance;
          to.balance = toBalance;
          await Promise.all([
            this.accountRepository.update(from, tx),
            this.accountRepository.update(to, tx),
          ]);

          return {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            applied: results.length,
            results,
          };
        }),
    );
  }
}
