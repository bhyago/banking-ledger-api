import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAccountByIdUseCase } from './get-account-by-id';
import type { AccountRepository } from '../repositories/account-repository';
import { accountErrors } from '../errors/account-errors';

const makeAccountRepository = (accountMock: any = null) => {
  return {
    findById: vi.fn(async () => accountMock),
  } as unknown as AccountRepository;
};

describe('GetAccountByIdAccountUseCase', () => {
  it('should return account data when found', async () => {
    const accountMock = {
      id: { toValue: () => 'mock-id' },
      number: '123456',
      balance: 1000,
      creditLimit: 500,
    };
    const accountRepository = makeAccountRepository(accountMock);
    const useCase = new GetAccountByIdUseCase(accountRepository);

    const result = await useCase.execute({ accountId: 'mock-id' });
    expect(result).toEqual({
      id: 'mock-id',
      number: '123456',
      balance: 1000,
      creditLimit: 500,
    });
    expect(accountRepository.findById).toHaveBeenCalledOnce();
  });

  it('should throw AccountNotFoundError when account is not found', async () => {
    const accountRepository = makeAccountRepository(null);
    const useCase = new GetAccountByIdUseCase(accountRepository);

    await expect(() =>
      useCase.execute({ accountId: 'not-found' }),
    ).rejects.toThrow(accountErrors.AccountNotFoundError);
    expect(accountRepository.findById).toHaveBeenCalledOnce();
  });
});
