import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountTransactionService } from './account-transaction.service';
import type { UnitOfWork } from '@/common/uow';
import type { AccountRepository } from '@/modules/account/repositories/account-repository';
import type { TransactionRepository } from '../repositories/transaction-repository';
import type { LedgerRepository } from '../repositories/ledger-repository';
import type { FeePolicyRepository } from '../repositories/fee-policy-repository';
import type { TransferRepository } from '../repositories/transfer-repository';
import { Account } from '@/modules/account/entities/account';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { transactionErrors } from '../errors/transaction-errors';
import { ulid } from 'ulid';

const makeUow = () =>
  ({
    run: vi.fn(async (fn: any) => fn({} as any)),
  }) as unknown as UnitOfWork;

const makeAccountRepository = () =>
  ({
    findById: vi.fn(),
    update: vi.fn(async () => {}),
  }) as unknown as AccountRepository;

const makeTransactionRepository = () =>
  ({
    create: vi.fn(async () => {}),
  }) as unknown as TransactionRepository;

const makeLedgerRepository = () =>
  ({
    append: vi.fn(async () => {}),
  }) as unknown as LedgerRepository;

const makeFeePolicyRepository = () =>
  ({
    findActiveByType: vi.fn(async () => null),
  }) as unknown as FeePolicyRepository;

const makeTransferRepository = () =>
  ({
    create: vi.fn(async () => {}),
    findByIdempotencyKey: vi.fn(async () => null),
  }) as unknown as TransferRepository;

describe('AccountTransactionService concurrency (transfer)', () => {
  let uow: UnitOfWork;
  let accountRepository: AccountRepository;
  let transactionRepository: TransactionRepository;
  let ledgerRepository: LedgerRepository;
  let feePolicyRepository: FeePolicyRepository;
  let transferRepository: TransferRepository;
  let service: AccountTransactionService;

  beforeEach(() => {
    uow = makeUow();
    accountRepository = makeAccountRepository();
    transactionRepository = makeTransactionRepository();
    ledgerRepository = makeLedgerRepository();
    feePolicyRepository = makeFeePolicyRepository();
    transferRepository = makeTransferRepository();
    const lock = new AccountLockService();
    service = new AccountTransactionService(
      uow,
      accountRepository,
      transactionRepository,
      ledgerRepository,
      feePolicyRepository,
      transferRepository,
      lock,
    );
  });

  it('serializes transfers from the same account to avoid overdraft', async () => {
    const fromId = ulid();
    const to1Id = ulid();
    const to2Id = ulid();

    const from = Account.create(
      { cpf: '11122233344', fullName: 'From Acc', creditLimit: 0 },
      new UniqueEntityID(fromId),
    );
    const to1 = Account.create(
      { cpf: '22233344455', fullName: 'To Acc 1', creditLimit: 0 },
      new UniqueEntityID(to1Id),
    );
    const to2 = Account.create(
      { cpf: '33344455566', fullName: 'To Acc 2', creditLimit: 0 },
      new UniqueEntityID(to2Id),
    );
    from.balance = 100;
    to1.balance = 0;
    to2.balance = 0;

    (accountRepository.findById as any).mockImplementation(
      async ({ accountId }: any) => {
        if (accountId === fromId) return from;
        if (accountId === to1Id) return to1;
        if (accountId === to2Id) return to2;
        return null;
      },
    );

    const t1 = service.transfer({
      fromAccountId: fromId,
      toAccountId: to1Id,
      amount: 70,
      idempotencyKey: 'k1',
    } as any);
    const t2 = service.transfer({
      fromAccountId: fromId,
      toAccountId: to2Id,
      amount: 70,
      idempotencyKey: 'k2',
    } as any);

    const [r1, r2] = await Promise.allSettled([t1, t2]);

    const successes = [r1, r2].filter((r) => r.status === 'fulfilled') as Array<
      PromiseFulfilledResult<any>
    >;
    const failures = [r1, r2].filter(
      (r) => r.status === 'rejected',
    ) as Array<PromiseRejectedResult>;

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].reason).toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    // Final balances reflect a single successful transfer of 70
    expect(from.balance).toBe(30);
    const credited = to1.balance === 70 ? to1 : to2;
    const untouched = credited === to1 ? to2 : to1;
    expect(credited.balance).toBe(70);
    expect(untouched.balance).toBe(0);
  });
});
