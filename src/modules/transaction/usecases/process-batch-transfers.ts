import { Inject, Injectable } from '@nestjs/common';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { type UnitOfWork, type UnitOfWorkTx, UNIT_OF_WORK } from '@/common/uow';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { FeePolicyRepository } from '../repositories/fee-policy-repository';
import { LedgerRepository } from '../repositories/ledger-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { TransferRepository } from '../repositories/transfer-repository';
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

  private isUniqueError(e: any) {
    const msg = String(e?.message || '');
    return e?.code === 'P2002' || /unique|duplicate/i.test(msg);
  }

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

          const transferPolicy =
            await this.feePolicyRepository.findActiveByType(
              { transactionType: TransactionType.TRANSFER, at: new Date() },
              tx,
            );

          // Pre-check: skip items that are already applied (idempotent)
          const existingMap = new Map<string, Transfer | null>();
          for (const it of input.items) {
            const existing = await this.transferRepository.findByIdempotencyKey(
              { idempotencyKey: it.idempotencyKey },
              tx,
            );
            existingMap.set(it.idempotencyKey, existing);
          }

          let fromBalance = from.balance;
          let toBalance = to.balance;
          for (const it of input.items) {
            if (existingMap.get(it.idempotencyKey)) continue;
            const fee = transferPolicy
              ? transferPolicy.calculate(it.amount)
              : 0;
            const total = it.amount + fee;
            if (fromBalance <= 0 && total > from.creditLimit) {
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

            const already = existingMap.get(it.idempotencyKey);
            if (already) {
              results.push({
                transferId: already.id.toValue(),
                fromAccountId: from.id.toValue(),
                toAccountId: to.id.toValue(),
                fromNewBalance: fromBalance,
                toNewBalance: toBalance,
                feeApplied: already.feeFrom,
              });
              continue;
            }

            const transfer = Transfer.create({
              fromAccountId: from.id,
              toAccountId: to.id,
              amount: it.amount,
              feeFrom: fee,
              idempotencyKey: it.idempotencyKey,
            });
            try {
              await this.transferRepository.create(transfer, tx);
            } catch (e) {
              if (this.isUniqueError(e)) {
                const existing =
                  await this.transferRepository.findByIdempotencyKey(
                    { idempotencyKey: it.idempotencyKey },
                    tx,
                  );
                if (existing) {
                  const [freshFrom, freshTo] = await Promise.all([
                    this.accountRepository.findById(
                      { accountId: from.id.toValue() },
                      tx,
                    ),
                    this.accountRepository.findById(
                      { accountId: to.id.toValue() },
                      tx,
                    ),
                  ]);
                  results.push({
                    transferId: existing.id.toValue(),
                    fromAccountId: from.id.toValue(),
                    toAccountId: to.id.toValue(),
                    fromNewBalance: freshFrom ? freshFrom.balance : fromBalance,
                    toNewBalance: freshTo ? freshTo.balance : toBalance,
                    feeApplied: existing.feeFrom,
                  });
                  continue;
                }
                throw e;
              }
              throw e;
            }

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
