import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateAccountUseCase } from './update-account';
import { AccountRepository } from '../repositories/account-repository';
import { Account } from '../entities/account';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { accountErrors } from '../errors/account-errors';

function makeRepo() {
  return {
    findById: vi.fn(),
    update: vi.fn(),
    findActiveByCPF: vi.fn(),
    save: vi.fn(),
  } as unknown as AccountRepository;
}

describe('UpdateAccountUseCase', () => {
  let repo: AccountRepository;
  let sut: UpdateAccountUseCase;

  beforeEach(() => {
    repo = makeRepo();
    sut = new UpdateAccountUseCase(repo);
  });

  it('updates fullName, cpf and creditLimit', async () => {
    const id = new UniqueEntityID('01J9MZ3ZYK2J4TN2YCE2V7ZVB8');
    const acc = Account.create(
      { creditLimit: 0, fullName: null, cpf: null } as any,
      id,
    );
    (repo.findById as any).mockResolvedValueOnce(acc);
    (repo.findActiveByCPF as any).mockResolvedValueOnce(null);

    const out = await sut.execute({
      accountId: id.toValue(),
      fullName: 'Nome Teste',
      cpf: '52998224725',
      creditLimit: 500,
    });

    expect(repo.update).toHaveBeenCalledOnce();
    expect(out.accountId).toBe(id.toValue());
    expect(out.cpf).toBe('52998224725');
  });

  it('throws when account not found', async () => {
    (repo.findById as any).mockResolvedValueOnce(null);
    await expect(
      sut.execute({ accountId: 'x', fullName: 'A' }),
    ).rejects.toBeInstanceOf(accountErrors.AccountNotFoundError);
  });

  it('throws when cpf is already in use by another active account', async () => {
    const id = new UniqueEntityID('01J9MZ3ZYK2J4TN2YCE2V7ZVB8');
    const acc = Account.create(
      { creditLimit: 0, fullName: null, cpf: null } as any,
      id,
    );
    (repo.findById as any).mockResolvedValueOnce(acc);
    (repo.findActiveByCPF as any).mockResolvedValueOnce(
      Account.create(
        { creditLimit: 0, fullName: null, cpf: null } as any,
        new UniqueEntityID('01J9MZ3ZYK2J4TN2YCE2V7ZVB9'),
      ),
    );

    await expect(
      sut.execute({ accountId: id.toValue(), cpf: '98765432100' }),
    ).rejects.toBeInstanceOf(accountErrors.CPFInUseForActiveAccountError);
  });
});
