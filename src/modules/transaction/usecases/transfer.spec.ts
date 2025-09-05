import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferUseCase } from './transfer';
import { AccountTransactionService } from '../services/account-transaction.service';
import { transactionErrors } from '../errors/transaction-errors';

const makeTxService = () => {
  return {
    transfer: vi.fn(),
  } as unknown as AccountTransactionService;
};

describe('TransferUseCase', () => {
  let txService: AccountTransactionService;
  let useCase: TransferUseCase;

  beforeEach(() => {
    txService = makeTxService();
    useCase = new TransferUseCase(txService);
  });

  it('should call txService.transfer without idempotencyKey and map output', async () => {
    const input = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 150,
      description: 'P2P test',
      'Idempotency-Key': 'idem-12345678',
    } as any;

    (txService.transfer as any).mockResolvedValueOnce({
      transferId: 'tr-1',
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      fromNewBalance: 840,
      toNewBalance: 350,
      feeApplied: 10,
    });

    const result = await useCase.execute(input);

    expect(txService.transfer).toHaveBeenCalledOnce();
    expect(txService.transfer).toHaveBeenCalledWith({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 150,
      description: 'P2P test',
    });
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
      'Idempotency-Key': 'k1',
    } as any;
    const error = new transactionErrors.TransferAccountsMustDifferError();
    (txService.transfer as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      transactionErrors.TransferAccountsMustDifferError,
    );
    expect(txService.transfer).toHaveBeenCalledOnce();
  });

  it('should propagate InsufficientFundsConsideringCreditLimitError', async () => {
    const input = {
      fromAccountId: 'acc-a',
      toAccountId: 'acc-b',
      amount: 9999,
      'Idempotency-Key': 'k2',
    } as any;
    const error =
      new transactionErrors.InsufficientFundsConsideringCreditLimitError();
    (txService.transfer as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );
    expect(txService.transfer).toHaveBeenCalledOnce();
  });
});
