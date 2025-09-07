import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawUseCase } from './withdraw';
import type { AccountTransactionService } from '../services/account-transaction.service';
import type { ProcessBatchAccountTransactionsUseCase } from './process-batch-account-transactions';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { transactionErrors } from '../errors/transaction-errors';

const makeTxService = () => {
  return {
    withdraw: vi.fn(),
  } as unknown as AccountTransactionService;
};
const makeBatch = () => {
  return {
    execute: vi.fn(),
  } as unknown as ProcessBatchAccountTransactionsUseCase;
};

describe('WithdrawUseCase', () => {
  let txService: AccountTransactionService;
  let batch: ProcessBatchAccountTransactionsUseCase;
  let useCase: WithdrawUseCase;

  beforeEach(() => {
    txService = makeTxService();
    batch = makeBatch();
    useCase = new WithdrawUseCase(txService, batch);
  });

  it('should call batch for single item and map the output', async () => {
    const input = {
      accountId: 'acc-1',
      amount: 80,
      description: 'ATM',
    } as any;

    (batch.execute as any).mockResolvedValueOnce({
      accountId: 'acc-1',
      applied: 1,
      finalBalance: 920,
      results: [
        {
          type: 'WITHDRAW',
          transactionId: 'tx-1',
          accountId: 'acc-1',
          newBalance: 920,
          feeApplied: 3,
        },
      ],
    });

    const result = await useCase.execute(input);

    expect(batch.execute).toHaveBeenCalledOnce();
    expect(txService.withdraw).not.toHaveBeenCalled();
    expect(result).toEqual({
      transactionId: 'tx-1',
      accountId: 'acc-1',
      newBalance: 920,
      feeApplied: 3,
    });
  });

  it('should propagate AccountNotFoundError from batch executor', async () => {
    const input = { accountId: 'missing', amount: 50 } as any;
    const error = new accountErrors.AccountNotFoundError();
    (batch.execute as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      accountErrors.AccountNotFoundError,
    );
    expect(batch.execute).toHaveBeenCalledOnce();
  });

  it('should propagate InsufficientFundsConsideringCreditLimitError from batch executor', async () => {
    const input = { accountId: 'acc-1', amount: 1000 } as any;
    const error =
      new transactionErrors.InsufficientFundsConsideringCreditLimitError();
    (batch.execute as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );
    expect(batch.execute).toHaveBeenCalledOnce();
  });
});

describe('WithdrawUseCase - batch path', () => {
  let txService: AccountTransactionService;
  let batch: ProcessBatchAccountTransactionsUseCase;
  let useCase: WithdrawUseCase;

  beforeEach(() => {
    txService = makeTxService();
    batch = makeBatch();
    useCase = new WithdrawUseCase(txService, batch);
  });

  it('groups by account and calls batch for multiple items', async () => {
    const items = [
      { accountId: 'acc-1', amount: 40, description: 'atm' },
      { accountId: 'acc-1', amount: 10, description: 'fee' },
    ] as any;

    (batch.execute as any).mockResolvedValueOnce({
      accountId: 'acc-1',
      applied: 2,
      finalBalance: 50,
      results: [
        {
          type: 'WITHDRAW',
          transactionId: 'tx-1',
          accountId: 'acc-1',
          newBalance: 60,
          feeApplied: 2,
        },
        {
          type: 'WITHDRAW',
          transactionId: 'tx-2',
          accountId: 'acc-1',
          newBalance: 50,
          feeApplied: 1,
        },
      ],
    });

    const res = (await useCase.execute(items)) as any[];
    expect(batch.execute).toHaveBeenCalledOnce();
    expect(res).toEqual([
      {
        transactionId: 'tx-1',
        accountId: 'acc-1',
        newBalance: 60,
        feeApplied: 2,
      },
      {
        transactionId: 'tx-2',
        accountId: 'acc-1',
        newBalance: 50,
        feeApplied: 1,
      },
    ]);
  });
});
