import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawUseCase } from './withdraw';
import { AccountTransactionService } from '../services/account-transaction.service';
import { accountErrors } from '@/modules/account/errors/account-errors';
import { transactionErrors } from '../errors/transaction-errors';

const makeTxService = () => {
  return {
    withdraw: vi.fn(),
  } as unknown as AccountTransactionService;
};

describe('WithdrawUseCase', () => {
  let txService: AccountTransactionService;
  let useCase: WithdrawUseCase;

  beforeEach(() => {
    txService = makeTxService();
    useCase = new WithdrawUseCase(txService);
  });

  it('should call txService.withdraw and map the output', async () => {
    const input = {
      accountId: 'acc-1',
      amount: 80,
      description: 'ATM',
    } as any;

    (txService.withdraw as any).mockResolvedValueOnce({
      transactionId: 'tx-1',
      accountId: 'acc-1',
      newBalance: 920,
      feeApplied: 3,
    });

    const result = await useCase.execute(input);

    expect(txService.withdraw).toHaveBeenCalledOnce();
    expect(txService.withdraw).toHaveBeenCalledWith({ ...input });
    expect(result).toEqual({
      transactionId: 'tx-1',
      accountId: 'acc-1',
      newBalance: 920,
      feeApplied: 3,
    });
  });

  it('should propagate AccountNotFoundError from txService.withdraw', async () => {
    const input = { accountId: 'missing', amount: 50 } as any;
    const error = new accountErrors.AccountNotFoundError();
    (txService.withdraw as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      accountErrors.AccountNotFoundError,
    );
    expect(txService.withdraw).toHaveBeenCalledOnce();
  });

  it('should propagate InsufficientFundsConsideringCreditLimitError from txService.withdraw', async () => {
    const input = { accountId: 'acc-1', amount: 1000 } as any;
    const error =
      new transactionErrors.InsufficientFundsConsideringCreditLimitError();
    (txService.withdraw as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );
    expect(txService.withdraw).toHaveBeenCalledOnce();
  });
});
