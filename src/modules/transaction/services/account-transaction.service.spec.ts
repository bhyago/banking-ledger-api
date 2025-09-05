import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountTransactionService } from './account-transaction.service';
import { UnitOfWork } from '@/common/uow';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { LedgerRepository } from '../repositories/ledger-repository';
import { Account } from '@/modules/account/entities/account';
import { Transaction } from '../entities/transaction';
import { LedgerEntry } from '../entities/ledger-entry';
import { TransactionType } from '../entities/enums';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { accountErrors } from '@/modules/account/errors/account-errors';

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

describe('AccountTransactionService.deposit', () => {
  let uow: UnitOfWork;
  let accountRepository: AccountRepository;
  let transactionRepository: TransactionRepository;
  let ledgerRepository: LedgerRepository;
  let service: AccountTransactionService;

  beforeEach(() => {
    uow = makeUow();
    accountRepository = makeAccountRepository();
    transactionRepository = makeTransactionRepository();
    ledgerRepository = makeLedgerRepository();
    service = new AccountTransactionService(
      uow,
      accountRepository,
      transactionRepository,
      ledgerRepository,
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
