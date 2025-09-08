import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateAccountUseCase } from './create-account';
import type { AccountRepository } from '../repositories/account-repository';
import { Account } from '../entities/account';

const makeAccountRepository = () => {
  return {
    save: vi.fn(async (account: Account) => {
      return { ...account, id: 'mock-id' };
    }),
    findActiveByCPF: vi.fn(),
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
    const result = await useCase.execute({
      fullName: 'Alice Test',
      cpf: '52998224725',
      creditLimit: 123.45,
    } as any);
    expect(result).toHaveProperty('accountId', 'mock-id');
    expect(accountRepository.save).toHaveBeenCalledOnce();
    const savedAccount = (accountRepository.save as any).mock.calls[0][0];
    expect(savedAccount).toBeInstanceOf(Account);
  });

  it('should set fullName and cpf when provided', async () => {
    const result = await useCase.execute({
      fullName: 'Maria',
      cpf: '15350946056',
      creditLimit: 0,
    } as any);
    expect(result).toHaveProperty('accountId', 'mock-id');
    const saved = (accountRepository.save as any).mock.calls.at(
      -1,
    )[0] as Account;
    expect(saved).toBeInstanceOf(Account);
  });

  it('should reject when cpf already used by active account', async () => {
    (accountRepository.findActiveByCPF as any).mockResolvedValueOnce(
      Account.create({ creditLimit: 0, fullName: null, cpf: null } as any),
    );
    await expect(
      useCase.execute({
        cpf: '52998224725',
        fullName: 'John',
        creditLimit: 0,
      } as any),
    ).rejects.toHaveProperty('name', 'CPF_IN_USE');
  });
});
