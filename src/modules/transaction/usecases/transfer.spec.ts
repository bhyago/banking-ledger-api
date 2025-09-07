import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferUseCase } from './transfer';
import type { AccountTransactionService } from '../services/account-transaction.service';
import type { ProcessBatchTransfersUseCase } from './process-batch-transfers';
import { transactionErrors } from '../errors/transaction-errors';

const makeTxService = () => {
  return {
    transfer: vi.fn(),
  } as unknown as AccountTransactionService;
};
const makeBatch = () => {
  return {
    execute: vi.fn(),
  } as unknown as ProcessBatchTransfersUseCase;
};

describe('TransferUseCase', () => {
  let txService: AccountTransactionService;
  let batch: ProcessBatchTransfersUseCase;
  let useCase: TransferUseCase;

  beforeEach(() => {
    txService = makeTxService();
    batch = makeBatch();
    useCase = new TransferUseCase(txService, batch);
  });

  it('should call batch for single item and map output', async () => {
    const input = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 150,
      description: 'P2P test',
      id: 'idem-12345678',
    } as any;

    (batch as any).execute.mockResolvedValueOnce({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      applied: 1,
      results: [
        {
          transferId: 'tr-1',
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          fromNewBalance: 840,
          toNewBalance: 350,
          feeApplied: 10,
        },
      ],
    });

    const result = await useCase.execute(input);

    expect(batch.execute).toHaveBeenCalledOnce();
    expect(txService.transfer).not.toHaveBeenCalled();
    expect(result).toEqual({
      transferId: 'tr-1',
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      fromNewBalance: 840,
      toNewBalance: 350,
      feeApplied: 10,
    });
  });

  it('should propagate TransferAccountsMustDifferError', async () => {
    const input = {
      fromAccountId: 'same',
      toAccountId: 'same',
      amount: 10,
      id: 'k1',
    } as any;
    const error = new transactionErrors.TransferAccountsMustDifferError();
    (batch.execute as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      transactionErrors.TransferAccountsMustDifferError,
    );
    expect(batch.execute).toHaveBeenCalledOnce();
  });

  it('should propagate InsufficientFundsConsideringCreditLimitError', async () => {
    const input = {
      fromAccountId: 'acc-a',
      toAccountId: 'acc-b',
      amount: 9999,
      id: 'k2',
    } as any;
    const error =
      new transactionErrors.InsufficientFundsConsideringCreditLimitError();
    (batch.execute as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );
    expect(batch.execute).toHaveBeenCalledOnce();
  });
});

describe('TransferUseCase - batch path', () => {
  let txService: AccountTransactionService;
  let batch: ProcessBatchTransfersUseCase;
  let useCase: TransferUseCase;

  beforeEach(() => {
    txService = makeTxService();
    batch = makeBatch();
    useCase = new TransferUseCase(txService, batch);
  });

  it('groups by pair and calls batch for multiple items', async () => {
    const items = [
      {
        fromAccountId: 'acc-a',
        toAccountId: 'acc-b',
        amount: 10,
        description: 'x',
        id: 'k1',
      },
      {
        fromAccountId: 'acc-a',
        toAccountId: 'acc-b',
        amount: 20,
        description: 'y',
        id: 'k2',
      },
    ] as any;

    (batch.execute as any).mockResolvedValueOnce({
      fromAccountId: 'acc-a',
      toAccountId: 'acc-b',
      applied: 2,
      results: [
        {
          transferId: 'tr-1',
          fromAccountId: 'acc-a',
          toAccountId: 'acc-b',
          fromNewBalance: 90,
          toNewBalance: 110,
          feeApplied: 1,
        },
        {
          transferId: 'tr-2',
          fromAccountId: 'acc-a',
          toAccountId: 'acc-b',
          fromNewBalance: 69,
          toNewBalance: 130,
          feeApplied: 1,
        },
      ],
    });

    const res = (await useCase.execute(items)) as any[];
    expect(batch.execute).toHaveBeenCalledOnce();
    expect((batch.execute as any).mock.calls[0][0]).toEqual(
      expect.objectContaining({ fromAccountId: 'acc-a', toAccountId: 'acc-b' }),
    );
    expect(res).toEqual([
      {
        transferId: 'tr-1',
        fromAccountId: 'acc-a',
        toAccountId: 'acc-b',
        fromNewBalance: 90,
        toNewBalance: 110,
        feeApplied: 1,
      },
      {
        transferId: 'tr-2',
        fromAccountId: 'acc-a',
        toAccountId: 'acc-b',
        fromNewBalance: 69,
        toNewBalance: 130,
        feeApplied: 1,
      },
    ]);
  });
});
