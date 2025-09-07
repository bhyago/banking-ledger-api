import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountTransactionService } from './account-transaction.service';
import { UnitOfWork } from '@/common/uow';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { LedgerRepository } from '../repositories/ledger-repository';
import { FeePolicyRepository } from '../repositories/fee-policy-repository';
import { TransferRepository } from '../repositories/transfer-repository';
import { Account } from '@/modules/account/entities/account';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { transactionErrors } from '../errors/transaction-errors';

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
    const from = Account.create({}, new UniqueEntityID('acc-from'));
    const to1 = Account.create({}, new UniqueEntityID('acc-to1'));
    const to2 = Account.create({}, new UniqueEntityID('acc-to2'));
    from.balance = 100;
    to1.balance = 0;
    to2.balance = 0;

    (accountRepository.findById as any).mockImplementation(
      async ({ accountId }: any) => {
        if (accountId === 'acc-from') return from;
        if (accountId === 'acc-to1') return to1;
        if (accountId === 'acc-to2') return to2;
        return null;
      },
    );

    const t1 = service.transfer({
      fromAccountId: 'acc-from',
      toAccountId: 'acc-to1',
      amount: 70,
      idempotencyKey: 'k1',
    } as any);
    const t2 = service.transfer({
      fromAccountId: 'acc-from',
      toAccountId: 'acc-to2',
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
