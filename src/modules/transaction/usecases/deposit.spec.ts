import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DepositUseCase } from './deposit';
import { AccountTransactionService } from '../services/account-transaction.service';
import { accountErrors } from '@/modules/account/errors/account-errors';

const makeTxService = () => {
  return {
    deposit: vi.fn(),
  } as unknown as AccountTransactionService;
};

describe('DepositUseCase', () => {
  let txService: AccountTransactionService;
  let useCase: DepositUseCase;

  beforeEach(() => {
    txService = makeTxService();
    useCase = new DepositUseCase(txService);
  });

  it('should call txService.deposit and map the output', async () => {
    const input = {
      accountId: 'acc-1',
      amount: 150.5,
      description: 'Initial deposit',
    } as any;

    (txService.deposit as any).mockResolvedValueOnce({
      transactionId: 'tx-1',
      accountId: 'acc-1',
      newBalance: 650.5,
    });

    const result = await useCase.execute(input);

    expect(txService.deposit).toHaveBeenCalledOnce();
    expect(txService.deposit).toHaveBeenCalledWith({ ...input });
    expect(result).toEqual({
      transactionId: 'tx-1',
      accountId: 'acc-1',
      newBalance: 650.5,
    });
  });

  it('should propagate errors from txService.deposit', async () => {
    const input = { accountId: 'acc-1', amount: 100 } as any;
    const error = new accountErrors.AccountNotFoundError();
    (txService.deposit as any).mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      accountErrors.AccountNotFoundError,
    );
    expect(txService.deposit).toHaveBeenCalledOnce();
  });
});
