import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountTransactionService } from './account-transaction.service';
import type { UnitOfWork } from '@/common/uow';
import type { AccountRepository } from '@/modules/account/repositories/account-repository';
import type { TransactionRepository } from '../repositories/transaction-repository';
import type { LedgerRepository } from '../repositories/ledger-repository';
import type { FeePolicyRepository } from '../repositories/fee-policy-repository';
import type { TransferRepository } from '../repositories/transfer-repository';
import { Account } from '@/modules/account/entities/account';
import { Transaction } from '../entities/transaction';
import { LedgerEntry } from '../entities/ledger-entry';
import { TransactionType } from '../entities/enums';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { FeePolicy } from '../entities/fee-policy';
import { transactionErrors } from '../errors/transaction-errors';
import { Transfer } from '../entities/transfer';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { ulid } from 'ulid';

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
    findByTypeAndIdempotencyKey: vi.fn(),
  }) as unknown as TransactionRepository;

const makeLedgerRepository = () =>
  ({
    append: vi.fn(),
  }) as unknown as LedgerRepository;

const makeFeePolicyRepository = () =>
  ({
    findActiveByType: vi.fn(),
  }) as unknown as FeePolicyRepository;

const makeTransferRepository = () =>
  ({
    create: vi.fn(),
    findByIdempotencyKey: vi.fn(),
  }) as unknown as TransferRepository;

describe('AccountTransactionService.deposit', () => {
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

  it('should deposit into an existing account and record transaction + ledger', async () => {
    const id = ulid();
    const accountId = new UniqueEntityID(id);
    const account = Account.create(
      { cpf: '11122233344', fullName: 'Alice', creditLimit: 0 },
      accountId,
    );
    account.balance = 500;

    (accountRepository.findById as any).mockResolvedValueOnce(account);
    (transactionRepository.create as any).mockResolvedValueOnce({ id: 'tx-1' });
    (ledgerRepository.append as any).mockResolvedValueOnce({ id: 'ld-1' });

    const input = {
      accountId: id,
      amount: 150.5,
      description: 'Deposit test',
      idempotencyKey: 'dep-1',
    };
    const result = await service.deposit(input);

    expect(uow.run).toHaveBeenCalledOnce();
    const tx = (uow.run as any).mock.calls[0][0];
    expect(typeof tx).toBe('function');

    expect(accountRepository.findById).toHaveBeenCalledWith(
      { accountId: id },
      expect.anything(),
    );

    const createdTx: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(createdTx).toBeInstanceOf(Transaction);
    expect(createdTx.type).toBe(TransactionType.DEPOSIT);
    expect(createdTx.amount).toBe(150.5);
    expect(createdTx.description).toBe('Deposit test');
    expect(createdTx.accountId.toValue()).toBe(id);

    const appendedEntry: LedgerEntry = (ledgerRepository.append as any).mock
      .calls[0][0];
    expect(appendedEntry).toBeInstanceOf(LedgerEntry);
    expect(appendedEntry.accountId.toValue()).toBe(id);
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
      accountId: id,
      newBalance: 650.5,
    });
  });

  it('should throw AccountNotFoundError when account is missing', async () => {
    (accountRepository.findById as any).mockResolvedValueOnce(null);

    await expect(
      service.deposit({
        accountId: 'missing',
        amount: 100,
        idempotencyKey: 'dep-missing',
      }),
    ).rejects.toBeInstanceOf(accountErrors.AccountNotFoundError);

    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });

  it('should be idempotent on duplicate key (deposit)', async () => {
    const id = ulid();
    const accountId = new UniqueEntityID(id);
    const account = Account.create(
      { cpf: '22233344455', fullName: 'Bob', creditLimit: 0 },
      accountId,
    );
    account.balance = 200;

    (accountRepository.findById as any).mockResolvedValue(account);
    // Simulate unique constraint (duplicate idempotency key)
    (transactionRepository.create as any).mockRejectedValueOnce({
      code: 'P2002',
    });
    // Return existing transaction for the idempotency key
    (
      transactionRepository.findByTypeAndIdempotencyKey as any
    ).mockResolvedValueOnce(
      Transaction.create(
        {
          accountId,
          type: TransactionType.DEPOSIT,
          amount: 50,
          idempotencyKey: 'dup-1',
        },
        new UniqueEntityID('tx-existing'),
      ),
    );

    const result = await service.deposit({
      accountId: id,
      amount: 50,
      idempotencyKey: 'dup-1',
    } as any);

    expect(result).toEqual({
      transactionId: 'tx-existing',
      accountId: id,
      newBalance: 200,
    });
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

  it('should withdraw with applicable fee and record ledger', async () => {
    const id = ulid();
    const accountId = new UniqueEntityID(id);
    const account = Account.create(
      { cpf: '33344455566', fullName: 'W1', creditLimit: 100 },
      accountId,
    );
    account.balance = 500;

    (accountRepository.findById as any).mockResolvedValueOnce(account);

    const policy = FeePolicy.create({
      transactionType: TransactionType.WITHDRAW,
      flatFee: 2,
      percentBps: 50, // 0.5%
      startsAt: new Date('2020-01-01T00:00:00Z'),
      endsAt: new Date('2099-01-01T00:00:00Z'),
    });
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(policy);

    const input = {
      accountId: id,
      amount: 200,
      description: 'ATM',
      idempotencyKey: 'wd-1',
    };
    const result = await service.withdraw(input);

    const createdTx: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(createdTx).toBeInstanceOf(Transaction);
    expect(createdTx.type).toBe(TransactionType.WITHDRAW);
    expect(createdTx.amount).toBe(200);
    // fee = 2 + 0.5% of 200 (=1) => 3
    expect(createdTx.fee).toBeCloseTo(3);
    expect(createdTx.description).toBe('ATM');
    expect(createdTx.accountId.toValue()).toBe(id);

    const appendedEntry: LedgerEntry = (ledgerRepository.append as any).mock
      .calls[0][0];
    expect(appendedEntry.debit).toBeCloseTo(203);
    expect(appendedEntry.credit).toBe(0);
    expect(appendedEntry.accountId.toValue()).toBe(id);
    expect(appendedEntry.transactionId?.toValue()).toBe(createdTx.id.toValue());
    expect(appendedEntry.balanceAfter).toBeCloseTo(297);

    const updatedAccount: Account = (accountRepository.update as any).mock
      .calls[0][0];
    expect(updatedAccount.balance).toBeCloseTo(297);

    expect(result.transactionId).toBe(createdTx.id.toValue());
    expect(result.accountId).toBe(id);
    expect(result.newBalance).toBeCloseTo(297);
    expect(result.feeApplied).toBeCloseTo(3);
  });

  it('should withdraw without fee when no active policy', async () => {
    const id = ulid();
    const accountId = new UniqueEntityID(id);
    const account = Account.create(
      { cpf: '44455566677', fullName: 'W2', creditLimit: 0 },
      accountId,
    );
    account.balance = 100;

    (accountRepository.findById as any).mockResolvedValueOnce(account);
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(null);

    const input = { accountId: id, amount: 40, idempotencyKey: 'wd-2' };
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

  it('should throw when available (balance+limit) < amount+fee and record REJECTED', async () => {
    const id = ulid();
    const accountId = new UniqueEntityID(id);
    const account = Account.create(
      { cpf: '55566677788', fullName: 'W3', creditLimit: 10 },
      accountId,
    );
    account.balance = 50;

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
      service.withdraw({ accountId: id, amount: 56, idempotencyKey: 'wd-3' }), // total = 61 > available 60
    ).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    expect(transactionRepository.create).toHaveBeenCalledOnce();
    const created: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(created.type).toBe(TransactionType.WITHDRAW);
    expect(created.status).toBe('REJECTED');
    expect(created.amount).toBe(56);
    expect(created.fee).toBe(5);
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });

  it('should be idempotent on duplicate key (withdraw)', async () => {
    const id = ulid();
    const accountId = new UniqueEntityID(id);
    const account = Account.create(
      { cpf: '66677788899', fullName: 'Wdup', creditLimit: 0 },
      accountId,
    );
    account.balance = 300;

    (accountRepository.findById as any).mockResolvedValue(account);
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(null);
    (transactionRepository.create as any).mockRejectedValueOnce({
      code: 'P2002',
    });
    (
      transactionRepository.findByTypeAndIdempotencyKey as any
    ).mockResolvedValueOnce(
      Transaction.create(
        {
          accountId,
          type: TransactionType.WITHDRAW,
          amount: 10,
          fee: 0,
          idempotencyKey: 'dup-2',
        },
        new UniqueEntityID('tx-w-existing'),
      ),
    );

    const result = await service.withdraw({
      accountId: id,
      amount: 10,
      idempotencyKey: 'dup-2',
    } as any);
    expect(result).toEqual({
      transactionId: 'tx-w-existing',
      accountId: id,
      newBalance: 300,
      feeApplied: 0,
    });
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });
});

describe('AccountTransactionService.transfer', () => {
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

  it('should throw when from and to accounts are the same', async () => {
    await expect(
      service.transfer({
        fromAccountId: 'a',
        toAccountId: 'a',
        amount: 10,
        idempotencyKey: 'k',
      } as any),
    ).rejects.toBeInstanceOf(transactionErrors.TransferAccountsMustDifferError);
  });

  it('should transfer with applicable fee and record ledger for both accounts', async () => {
    const fromIdStr = ulid();
    const toIdStr = ulid();
    const fromId = new UniqueEntityID(fromIdStr);
    const toId = new UniqueEntityID(toIdStr);
    const from = Account.create(
      { cpf: '77788899900', fullName: 'From1', creditLimit: 50 },
      fromId,
    );
    const to = Account.create(
      { cpf: '99900011122', fullName: 'To1', creditLimit: 0 },
      toId,
    );
    from.balance = 500;
    from.creditLimit = 50;
    to.balance = 200;

    (accountRepository.findById as any).mockImplementation(
      ({ accountId }: any) => {
        if (accountId === fromIdStr) return Promise.resolve(from);
        if (accountId === toIdStr) return Promise.resolve(to);
        return Promise.resolve(null);
      },
    );

    const policy = FeePolicy.create({
      transactionType: TransactionType.TRANSFER,
      flatFee: 2,
      percentBps: 100, // 1%
      startsAt: new Date('2020-01-01T00:00:00Z'),
      endsAt: new Date('2099-01-01T00:00:00Z'),
    });
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(policy);

    const result = await service.transfer({
      fromAccountId: fromIdStr,
      toAccountId: toIdStr,
      amount: 100,
      description: 'P2P',
      idempotencyKey: 'tr-1',
    });

    const createdTransfer: Transfer = (transferRepository.create as any).mock
      .calls[0][0];
    expect(createdTransfer).toBeInstanceOf(Transfer);
    expect(createdTransfer.amount).toBe(100);
    // fee = 2 + 1% of 100 (=1) => 3
    expect(createdTransfer.feeFrom).toBe(3);
    expect(createdTransfer.fromAccountId.toValue()).toBe(fromIdStr);
    expect(createdTransfer.toAccountId.toValue()).toBe(toIdStr);

    // two transactions created
    expect((transactionRepository.create as any).mock.calls.length).toBe(2);
    const txArgs = (transactionRepository.create as any).mock.calls.map(
      (c: any[]) => c[0],
    ) as Transaction[];
    const txFrom = txArgs.find((t) => t.accountId.toValue() === fromIdStr)!;
    const txTo = txArgs.find((t) => t.accountId.toValue() === toIdStr)!;

    expect(txFrom.type).toBe(TransactionType.TRANSFER);
    expect(txFrom.amount).toBe(100);
    expect(txFrom.fee).toBe(3);
    expect(txFrom.relatedAccountId?.toValue()).toBe(toIdStr);
    expect(txFrom.transferId?.toValue()).toBe(createdTransfer.id.toValue());

    expect(txTo.type).toBe(TransactionType.TRANSFER);
    expect(txTo.amount).toBe(100);
    expect(txTo.fee).toBe(0);
    expect(txTo.relatedAccountId?.toValue()).toBe(fromIdStr);
    expect(txTo.transferId?.toValue()).toBe(createdTransfer.id.toValue());

    const entries = (ledgerRepository.append as any).mock.calls.map(
      (c: any[]) => c[0],
    ) as LedgerEntry[];
    const entryFrom = entries.find((e) => e.accountId.toValue() === fromIdStr)!;
    const entryTo = entries.find((e) => e.accountId.toValue() === toIdStr)!;
    expect(entryFrom.debit).toBe(103);
    expect(entryFrom.credit).toBe(0);
    expect(entryFrom.transferId?.toValue()).toBe(createdTransfer.id.toValue());
    expect(entryFrom.balanceAfter).toBe(397);

    expect(entryTo.debit).toBe(0);
    expect(entryTo.credit).toBe(100);
    expect(entryTo.transferId?.toValue()).toBe(createdTransfer.id.toValue());
    expect(entryTo.balanceAfter).toBe(300);

    const updates = (accountRepository.update as any).mock.calls.map(
      (c: any[]) => c[0],
    ) as Account[];
    const updatedFrom = updates.find((a) => a.id.toValue() === fromIdStr)!;
    const updatedTo = updates.find((a) => a.id.toValue() === toIdStr)!;
    expect(updatedFrom.balance).toBe(397);
    expect(updatedTo.balance).toBe(300);

    expect(result.transferId).toBe(createdTransfer.id.toValue());
    expect(result.fromAccountId).toBe(fromIdStr);
    expect(result.toAccountId).toBe(toIdStr);
    expect(result.fromNewBalance).toBe(397);
    expect(result.toNewBalance).toBe(300);
    expect(result.feeApplied).toBe(3);
  });

  it('should transfer without fee when no active policy', async () => {
    const fromIdStr = ulid();
    const toIdStr = ulid();
    const from = Account.create(
      { cpf: '21222324252', fullName: 'From3', creditLimit: 0 },
      new UniqueEntityID(fromIdStr),
    );
    const to = Account.create(
      { cpf: '52524232212', fullName: 'To3', creditLimit: 0 },
      new UniqueEntityID(toIdStr),
    );
    from.balance = 100;
    from.creditLimit = 0;
    to.balance = 0;

    (accountRepository.findById as any).mockImplementation(
      ({ accountId }: any) => {
        if (accountId === fromIdStr) return Promise.resolve(from);
        if (accountId === toIdStr) return Promise.resolve(to);
        return Promise.resolve(null);
      },
    );
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(null);

    const res = await service.transfer({
      fromAccountId: fromIdStr,
      toAccountId: toIdStr,
      amount: 60,
      idempotencyKey: 'k2',
    } as any);

    const entryFrom: LedgerEntry = (
      ledgerRepository.append as any
    ).mock.calls.find((c: any[]) => c[0].accountId.toValue() === fromIdStr)[0];
    const entryTo: LedgerEntry = (
      ledgerRepository.append as any
    ).mock.calls.find((c: any[]) => c[0].accountId.toValue() === toIdStr)[0];
    expect(entryFrom.debit).toBe(60);
    expect(entryFrom.balanceAfter).toBe(40);
    expect(entryTo.credit).toBe(60);
    expect(entryTo.balanceAfter).toBe(60);

    expect(res.feeApplied).toBe(0);
    expect(res.fromNewBalance).toBe(40);
    expect(res.toNewBalance).toBe(60);
  });

  it('should throw AccountNotFoundError when one of the accounts is missing', async () => {
    const fromIdStr = ulid();
    const from = Account.create(
      { cpf: '30313233344', fullName: 'From5', creditLimit: 0 },
      new UniqueEntityID(fromIdStr),
    );
    from.balance = 100;
    (accountRepository.findById as any).mockImplementation(
      ({ accountId }: any) => {
        if (accountId === fromIdStr) return Promise.resolve(from);
        return Promise.resolve(null);
      },
    );
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(null);

    await expect(
      service.transfer({
        fromAccountId: fromIdStr,
        toAccountId: 'missing',
        amount: 10,
        idempotencyKey: 'k3',
      } as any),
    ).rejects.toBeInstanceOf(accountErrors.AccountNotFoundError);
  });

  it('should throw when available of from < amount + fee and record REJECTED', async () => {
    const fromIdStr = ulid();
    const toIdStr = ulid();
    const from = Account.create(
      { cpf: '40414243454', fullName: 'From6', creditLimit: 0 },
      new UniqueEntityID(fromIdStr),
    );
    const to = Account.create(
      { cpf: '45434442414', fullName: 'To6', creditLimit: 0 },
      new UniqueEntityID(toIdStr),
    );
    from.balance = 20;
    from.creditLimit = 0; // available 20
    to.balance = 0;
    (accountRepository.findById as any).mockImplementation(
      ({ accountId }: any) => {
        if (accountId === fromIdStr) return Promise.resolve(from);
        if (accountId === toIdStr) return Promise.resolve(to);
        return Promise.resolve(null);
      },
    );

    const policy = FeePolicy.create({
      transactionType: TransactionType.TRANSFER,
      flatFee: 5,
      percentBps: 0,
      startsAt: new Date('2020-01-01T00:00:00Z'),
      endsAt: new Date('2099-01-01T00:00:00Z'),
    });
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(policy);

    await expect(
      service.transfer({
        fromAccountId: fromIdStr,
        toAccountId: toIdStr,
        amount: 16,
        idempotencyKey: 'k4',
      } as any), // total 21 > available 20
    ).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    expect(transferRepository.create).not.toHaveBeenCalled();
    expect(transactionRepository.create).toHaveBeenCalledOnce();
    const created: Transaction = (transactionRepository.create as any).mock
      .calls[0][0];
    expect(created.type).toBe(TransactionType.TRANSFER);
    expect(created.status).toBe('REJECTED');
    expect(created.amount).toBe(16);
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });

  it('should be idempotent on duplicate key (transfer)', async () => {
    const fromIdStr = ulid();
    const toIdStr = ulid();
    const from = Account.create(
      { cpf: '51525354565', fullName: 'FromDup', creditLimit: 0 },
      new UniqueEntityID(fromIdStr),
    );
    const to = Account.create(
      { cpf: '56545553515', fullName: 'ToDup', creditLimit: 0 },
      new UniqueEntityID(toIdStr),
    );
    from.balance = 100;
    from.creditLimit = 0;
    to.balance = 0;

    (accountRepository.findById as any).mockImplementation(
      ({ accountId }: any) => {
        if (accountId === fromIdStr) return Promise.resolve(from);
        if (accountId === toIdStr) return Promise.resolve(to);
        return Promise.resolve(null);
      },
    );
    (feePolicyRepository.findActiveByType as any).mockResolvedValueOnce(null);
    (transferRepository.create as any).mockRejectedValueOnce({ code: 'P2002' });
    (transferRepository.findByIdempotencyKey as any).mockResolvedValueOnce(
      Transfer.create(
        {
          fromAccountId: from.id,
          toAccountId: to.id,
          amount: 20,
          feeFrom: 0,
          idempotencyKey: 'dup-tr-1',
        },
        new UniqueEntityID('tr-existing'),
      ),
    );

    const res = await service.transfer({
      fromAccountId: fromIdStr,
      toAccountId: toIdStr,
      amount: 20,
      idempotencyKey: 'dup-tr-1',
    } as any);
    expect(res).toEqual({
      transferId: 'tr-existing',
      fromAccountId: fromIdStr,
      toAccountId: toIdStr,
      fromNewBalance: 100,
      toNewBalance: 0,
      feeApplied: 0,
    });
    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(ledgerRepository.append).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
  });
});
