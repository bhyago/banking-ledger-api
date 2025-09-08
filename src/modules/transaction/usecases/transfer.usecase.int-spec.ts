import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TransferUseCase } from '@/modules/transaction/usecases/transfer';
import { AccountTransactionService } from '@/modules/transaction/services/account-transaction.service';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { TransactionRepository } from '@/modules/transaction/repositories/transaction-repository';
import { LedgerRepository } from '@/modules/transaction/repositories/ledger-repository';
import { FeePolicyRepository } from '@/modules/transaction/repositories/fee-policy-repository';
import { TransferRepository } from '@/modules/transaction/repositories/transfer-repository';
import { UNIT_OF_WORK, type UnitOfWork } from '@/common/uow';
import { Account } from '@/modules/account/entities/account';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import type { Transaction } from '@/modules/transaction/entities/transaction';
import type { LedgerEntry } from '@/modules/transaction/entities/ledger-entry';
import type { Transfer } from '@/modules/transaction/entities/transfer';
import { transactionErrors } from '@/modules/transaction/errors/transaction-errors';

class InMemoryAccountRepository implements AccountRepository {
  constructor(public items = new Map<string, Account>()) {}
  async save(input: Account): Promise<{ id: string }> {
    this.items.set(input.id.toValue(), input);
    return { id: input.id.toValue() };
  }
  async findById({
    accountId,
  }: {
    accountId: string;
  }): Promise<Account | null> {
    return this.items.get(accountId) ?? null;
  }
  async update(input: Account): Promise<void> {
    this.items.set(input.id.toValue(), input);
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  public items: Transaction[] = [];
  public idempotencyKeys = new Set<string>();
  async create(input: Transaction): Promise<{ id: string }> {
    if (input.idempotencyKey) {
      if (this.idempotencyKeys.has(input.idempotencyKey)) {
        const err: any = new Error('duplicate key');
        err.code = 'P2002';
        throw err;
      }
      this.idempotencyKeys.add(input.idempotencyKey);
    }
    this.items.push(input);
    return { id: input.id.toValue() };
  }
}

class InMemoryLedgerRepository implements LedgerRepository {
  public items: LedgerEntry[] = [];
  async append(input: LedgerEntry): Promise<{ id: string }> {
    this.items.push(input);
    return { id: input.id.toValue() } as any;
  }
}

class InMemoryTransferRepository implements TransferRepository {
  public items: Transfer[] = [];
  public idempotencyKeys = new Set<string>();
  async create(input: Transfer): Promise<{ id: string }> {
    if (input.idempotencyKey) {
      if (this.idempotencyKeys.has(input.idempotencyKey)) {
        const err: any = new Error('duplicate key');
        err.code = 'P2002';
        throw err;
      }
      this.idempotencyKeys.add(input.idempotencyKey);
    }
    this.items.push(input);
    return { id: input.id.toValue() } as any;
  }
}

class InMemoryFeePolicyRepository implements FeePolicyRepository {
  async findActiveByType(): Promise<any> {
    return null;
  }
}

describe('Transfer integration (service + use case + locks)', () => {
  let moduleRef: any;
  let accounts: InMemoryAccountRepository;
  let txUseCase: TransferUseCase;

  beforeEach(async () => {
    accounts = new InMemoryAccountRepository();
    const from = Account.create(
      { cpf: '00011122233', fullName: 'From I', creditLimit: 0 },
      new UniqueEntityID('acc-i-from'),
    );
    const to1 = Account.create(
      { cpf: '11122233344', fullName: 'To I 1', creditLimit: 0 },
      new UniqueEntityID('acc-i-to1'),
    );
    const to2 = Account.create(
      { cpf: '22233344455', fullName: 'To I 2', creditLimit: 0 },
      new UniqueEntityID('acc-i-to2'),
    );
    from.balance = 100;
    to1.balance = 0;
    to2.balance = 0;
    await accounts.save(from);
    await accounts.save(to1);
    await accounts.save(to2);

    const uow: UnitOfWork = { run: async (fn) => fn({} as any) };

    moduleRef = await Test.createTestingModule({
      providers: [
        TransferUseCase,
        AccountTransactionService,
        AccountLockService,
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: AccountRepository, useValue: accounts },
        {
          provide: TransactionRepository,
          useClass: InMemoryTransactionRepository,
        },
        { provide: LedgerRepository, useClass: InMemoryLedgerRepository },
        { provide: FeePolicyRepository, useClass: InMemoryFeePolicyRepository },
        { provide: TransferRepository, useClass: InMemoryTransferRepository },
      ],
    }).compile();

    txUseCase = moduleRef.get(TransferUseCase);
  });

  it('serializes concurrent transfers from same account', async () => {
    const input1 = {
      id: 'int-1',
      fromAccountId: 'acc-i-from',
      toAccountId: 'acc-i-to1',
      amount: 70,
      description: 'X',
      idempotencyKey: 'int-1',
    } as any;
    const input2 = {
      id: 'int-2',
      fromAccountId: 'acc-i-from',
      toAccountId: 'acc-i-to2',
      amount: 70,
      description: 'Y',
      idempotencyKey: 'int-2',
    } as any;

    const p1 = txUseCase.execute(input1);
    const p2 = txUseCase.execute(input2);
    const [a, b] = await Promise.allSettled([p1, p2]);

    const fulfilled = [a, b].filter((r) => r.status === 'fulfilled');
    const rejected = [a, b].filter(
      (r) => r.status === 'rejected',
    ) as Array<PromiseRejectedResult>;

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    const from = await accounts.findById({ accountId: 'acc-i-from' });
    const to1 = await accounts.findById({ accountId: 'acc-i-to1' });
    const to2 = await accounts.findById({ accountId: 'acc-i-to2' });
    expect(from!.balance).toBe(30);
    expect([to1!.balance, to2!.balance].sort()).toEqual([0, 70]);
  });
});
