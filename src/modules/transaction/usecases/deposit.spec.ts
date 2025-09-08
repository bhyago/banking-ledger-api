import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DepositUseCase } from './deposit';
import type { AccountTransactionService } from '../services/account-transaction.service';
import type { ProcessBatchAccountTransactionsUseCase } from './process-batch-account-transactions';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { ULID } from 'test/ids';

const makeTxService = () => {
  return {
    deposit: vi.fn(),
  } as unknown as AccountTransactionService;
};
const makeBatch = () => {
  return {
    execute: vi.fn(),
  } as unknown as ProcessBatchAccountTransactionsUseCase;
};

describe('DepositUseCase', () => {
  let txService: AccountTransactionService;
  let batch: ProcessBatchAccountTransactionsUseCase;
  let useCase: DepositUseCase;

  beforeEach(() => {
    txService = makeTxService();
    batch = makeBatch();
    useCase = new DepositUseCase(txService, batch);
  });

  it('should call batch for single item and map the output', async () => {
    const input = {
      accountId: ULID.ACC1,
      amount: 150.5,
      description: 'Initial deposit',
    } as any;

    (batch.execute as any).mockResolvedValueOnce({
      accountId: ULID.ACC1,
      applied: 1,
      finalBalance: 650.5,
      results: [
        {
          type: 'DEPOSIT',
          transactionId: 'tx-1',
          accountId: ULID.ACC1,
          newBalance: 650.5,
        },
      ],
    });

    const result = await useCase.execute(input);

    expect(batch.execute).toHaveBeenCalledOnce();
    expect(txService.deposit).not.toHaveBeenCalled();
    expect(result).toEqual({
      transactionId: 'tx-1',
      accountId: ULID.ACC1,
      newBalance: 650.5,
    });
  });

  it('should propagate errors from batch executor', async () => {
    const input = { accountId: ULID.ACC1, amount: 100 } as any;
    const error = new accountErrors.AccountNotFoundError();
    (batch.execute as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      accountErrors.AccountNotFoundError,
    );
    expect(batch.execute).toHaveBeenCalledOnce();
  });
});

describe('DepositUseCase - batch path', () => {
  let txService: AccountTransactionService;
  let batch: ProcessBatchAccountTransactionsUseCase;
  let useCase: DepositUseCase;

  beforeEach(() => {
    txService = makeTxService();
    batch = makeBatch();
    useCase = new DepositUseCase(txService, batch);
  });

  it('groups by account and calls batch for multiple items', async () => {
    const items = [
      { accountId: ULID.ACC1, amount: 100, description: 'a' },
      { accountId: ULID.ACC1, amount: 50, description: 'b' },
    ] as any;

    (batch.execute as any).mockResolvedValueOnce({
      accountId: ULID.ACC1,
      applied: 2,
      finalBalance: 150,
      results: [
        {
          type: 'DEPOSIT',
          transactionId: 'tx-1',
          accountId: ULID.ACC1,
          newBalance: 100,
        },
        {
          type: 'DEPOSIT',
          transactionId: 'tx-2',
          accountId: ULID.ACC1,
          newBalance: 150,
        },
      ],
    });

    const res = (await useCase.execute(items)) as any[];
    expect(batch.execute).toHaveBeenCalledOnce();
    expect(res).toEqual([
      { transactionId: 'tx-1', accountId: ULID.ACC1, newBalance: 100 },
      { transactionId: 'tx-2', accountId: ULID.ACC1, newBalance: 150 },
    ]);
  });
});
