import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateAccountUseCase } from './create-account';
import type { AccountRepository } from '../repositories/account-repository';
import { Account } from '../entities/account';

const makeAccountRepository = () => {
  return {
    save: vi.fn(async (account: Account) => {
      return { ...account, id: 'mock-id' };
    }),
  } as unknown as AccountRepository;
};

describe('CreateAccountUseCase', () => {
  let accountRepository: AccountRepository;
  let useCase: CreateAccountUseCase;

  beforeEach(() => {
    accountRepository = makeAccountRepository();
    useCase = new CreateAccountUseCase(accountRepository);
  });

  it('should create and save an account, returning its id', async () => {
    const result = await useCase.execute({ creditLimit: 123.45 } as any);
    expect(result).toHaveProperty('accountId', 'mock-id');
    expect(accountRepository.save).toHaveBeenCalledOnce();
    const savedAccount = (accountRepository.save as any).mock.calls[0][0];
    expect(savedAccount).toBeInstanceOf(Account);
    // creditLimit should be applied
    expect(savedAccount.creditLimit).toBe(123.45);
  });
});
