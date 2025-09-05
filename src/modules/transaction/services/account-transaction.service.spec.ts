import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountTransactionService } from './account-transaction.service';
import { UnitOfWork } from '@/common/uow';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { LedgerRepository } from '../repositories/ledger-repository';
import { FeePolicyRepository } from '../repositories/fee-policy-repository';
import { Account } from '@/modules/account/entities/account';
import { Transaction } from '../entities/transaction';
import { LedgerEntry } from '../entities/ledger-entry';
import { TransactionType } from '../entities/enums';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { FeePolicy } from '../entities/fee-policy';
import { transactionErrors } from '../errors/transaction-errors';

const makeUow = () =>
  ({
    run: vi.fn(async (fn: any) => {
      const tx = {} as any;
      return fn(tx);
    }),
  }) as unknown as UnitOfWork;

const makeAccountRepository = () =>
  ({
    findById: vi.fn(),
    update: vi.fn(),
  }) as unknown as AccountRepository;

const makeTransactionRepository = () =>
  ({
    create: vi.fn(),
  }) as unknown as TransactionRepository;

const makeLedgerRepository = () =>
  ({
    append: vi.fn(),
  }) as unknown as LedgerRepository;

const makeFeePolicyRepository = () =>
  ({
    findActiveByType: vi.fn(),
  }) as unknown as FeePolicyRepository;

describe('AccountTransactionService.deposit', () => {
  let uow: UnitOfWork;
  let accountRepository: AccountRepository;
  let transactionRepository: TransactionRepository;
  let ledgerRepository: LedgerRepository;
  let feePolicyRepository: FeePolicyRepository;
  let service: AccountTransactionService;

  beforeEach(() => {
    uow = makeUow();
    accountRepository = makeAccountRepository();
    transactionRepository = makeTransactionRepository();
    ledgerRepository = makeLedgerRepository();
    feePolicyRepository = makeFeePolicyRepository();
    service = new AccountTransactionService(
      uow,
      accountRepository,
      transactionRepository,
      ledgerRepository,
      feePolicyRepository,
    );
  });

  it('should deposit into an existing account and record transaction + ledger', async () => {
    const accountId = new UniqueEntityID('acc-1');
    const account = Account.create({}, accountId);
    account.balance = 500;

    (accountRepository.findById as any).mockResolvedValueOnce(account);
    (transactionRepository.create as any).mockResolvedValueOnce({ id: 'tx-1' });
    (ledgerRepository.append as any).mockResolvedValueOnce({ id: 'ld-1' });

    const input = {
      accountId: 'acc-1',
      amount: 150.5,
      description: 'Deposit test',
    };
    const result = await service.deposit(input);

    expect(uow.run).toHaveBeenCalledOnce();
    const tx = (uow.run as any).mock.calls[0][0];
    expect(typeof tx).toBe('function');

    expect(accountRepository.findById).toHaveBeenCalledWith(
      { accountId: 'acc-1' },
      expect.anything(),
    );

    const createdTx: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(createdTx).toBeInstanceOf(Transaction);
    expect(createdTx.type).toBe(TransactionType.DEPOSIT);
    expect(createdTx.amount).toBe(150.5);
    expect(createdTx.description).toBe('Deposit test');
    expect(createdTx.accountId.toValue()).toBe('acc-1');

    const appendedEntry: LedgerEntry = (ledgerRepository.append as any).mock
      .calls[0][0];
    expect(appendedEntry).toBeInstanceOf(LedgerEntry);
    expect(appendedEntry.accountId.toValue()).toBe('acc-1');
    expect(appendedEntry.transactionId?.toValue()).toBe(createdTx.id.toValue());
    expect(appendedEntry.transferId).toBeNull();
    expect(appendedEntry.debit).toBe(0);
    expect(appendedEntry.credit).toBe(150.5);
    expect(appendedEntry.balanceAfter).toBe(650.5);

    const updatedAccount: Account = (accountRepository.update as any).mock
      .calls[0][0];
    expect(updatedAccount).toBe(account);
    expect(updatedAccount.balance).toBe(650.5);

    expect(result).toEqual({
      transactionId: createdTx.id.toValue(),
      accountId: 'acc-1',
      newBalance: 650.5,
    });
  });

  it('should throw AccountNotFoundError when account is missing', async () => {
    (accountRepository.findById as any).mockResolvedValueOnce(null);

    await expect(
      service.deposit({ accountId: 'missing', amount: 100 }),
    ).rejects.toBeInstanceOf(accountErrors.AccountNotFoundError);

    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });
});

describe('AccountTransactionService.withdraw', () => {
  let uow: UnitOfWork;
  let accountRepository: AccountRepository;
  let transactionRepository: TransactionRepository;
  let ledgerRepository: LedgerRepository;
  let feePolicyRepository: FeePolicyRepository;
  let service: AccountTransactionService;

  beforeEach(() => {
    uow = makeUow();
    accountRepository = makeAccountRepository();
    transactionRepository = makeTransactionRepository();
    ledgerRepository = makeLedgerRepository();
    feePolicyRepository = makeFeePolicyRepository();
    service = new AccountTransactionService(
      uow,
      accountRepository,
      transactionRepository,
      ledgerRepository,
      feePolicyRepository,
    );
  });

  it('should withdraw with applicable fee and record ledger', async () => {
    const accountId = new UniqueEntityID('acc-w1');
    const account = Account.create({}, accountId);
    account.balance = 500;
    account.creditLimit = 100;

    (accountRepository.findById as any).mockResolvedValueOnce(account);

    const policy = FeePolicy.create({
      transactionType: TransactionType.WITHDRAW,
      flatFee: 2,
      percentBps: 50, // 0.5%
      startsAt: new Date('2020-01-01T00:00:00Z'),
      endsAt: new Date('2099-01-01T00:00:00Z'),
    });
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(policy);

    const input = { accountId: 'acc-w1', amount: 200, description: 'ATM' };
    const result = await service.withdraw(input);

    const createdTx: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(createdTx).toBeInstanceOf(Transaction);
    expect(createdTx.type).toBe(TransactionType.WITHDRAW);
    expect(createdTx.amount).toBe(200);
    // fee = 2 + 0.5% of 200 (=1) => 3
    expect(createdTx.fee).toBeCloseTo(3);
    expect(createdTx.description).toBe('ATM');
    expect(createdTx.accountId.toValue()).toBe('acc-w1');

    const appendedEntry: LedgerEntry = (ledgerRepository.append as any).mock
      .calls[0][0];
    expect(appendedEntry.debit).toBeCloseTo(203);
    expect(appendedEntry.credit).toBe(0);
    expect(appendedEntry.accountId.toValue()).toBe('acc-w1');
    expect(appendedEntry.transactionId?.toValue()).toBe(createdTx.id.toValue());
    expect(appendedEntry.balanceAfter).toBeCloseTo(297);

    const updatedAccount: Account = (accountRepository.update as any).mock
      .calls[0][0];
    expect(updatedAccount.balance).toBeCloseTo(297);

    expect(result.transactionId).toBe(createdTx.id.toValue());
    expect(result.accountId).toBe('acc-w1');
    expect(result.newBalance).toBeCloseTo(297);
    expect(result.feeApplied).toBeCloseTo(3);
  });

  it('should withdraw without fee when no active policy', async () => {
    const accountId = new UniqueEntityID('acc-w2');
    const account = Account.create({}, accountId);
    account.balance = 100;
    account.creditLimit = 0;

    (accountRepository.findById as any).mockResolvedValueOnce(account);
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(null);

    const input = { accountId: 'acc-w2', amount: 40 };
    const result = await service.withdraw(input as any);

    const createdTx: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(createdTx.fee).toBe(0);

    const appendedEntry: LedgerEntry = (ledgerRepository.append as any).mock
      .calls[0][0];
    expect(appendedEntry.debit).toBe(40);
    expect(appendedEntry.balanceAfter).toBe(60);

    expect(result.newBalance).toBe(60);
    expect(result.feeApplied).toBe(0);
  });

  it('should throw when available (balance+limit) < amount+fee', async () => {
    const accountId = new UniqueEntityID('acc-w3');
    const account = Account.create({}, accountId);
    account.balance = 50;
    account.creditLimit = 10; // available = 60

    (accountRepository.findById as any).mockResolvedValueOnce(account);

    const policy = FeePolicy.create({
      transactionType: TransactionType.WITHDRAW,
      flatFee: 5,
      percentBps: 0,
      startsAt: new Date('2020-01-01T00:00:00Z'),
      endsAt: new Date('2099-01-01T00:00:00Z'),
    });
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(policy);

    await expect(
      service.withdraw({ accountId: 'acc-w3', amount: 56 }), // total = 61 > available 60
    ).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });
});
