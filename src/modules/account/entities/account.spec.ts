import { describe, it, expect } from 'vitest';
import { Account } from './account';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { ulid } from 'ulid';

describe('Account Entity', () => {
  it('should create an account ', () => {
    const account = Account.create({
      cpf: '12345678900',
      fullName: 'John Doe',
      creditLimit: 500,
    });
    expect(account.balance).toBe(0);
    expect(account.creditLimit).toBe(500);
    expect(account.number).toBeTypeOf('string');
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.updatedAt).toBeInstanceOf(Date);
    expect(account.deletedAt).toBeNull();
  });

  it('should allow setting and getting properties', () => {
    const account = Account.create({
      cpf: '12345678900',
      fullName: 'Jane Roe',
      creditLimit: 0,
    });
    account.balance = 1000;
    account.creditLimit = 500;
    account.number = '123456';
    account.deletedAt = new Date('2025-09-03T00:00:00Z');

    expect(account.balance).toBe(1000);
    expect(account.creditLimit).toBe(500);
    expect(account.number).toBe('123456');
    expect(account.deletedAt).toEqual(new Date('2025-09-03T00:00:00Z'));
  });

  it('should update updatedAt when a property changes', () => {
    const account = Account.create({
      cpf: '12345678900',
      fullName: 'John Doe',
      creditLimit: 0,
    });
    const oldUpdatedAt = account.updatedAt;
    account.balance = account.balance + 1;
    expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(
      oldUpdatedAt.getTime(),
    );
  });

  it('should generate account number from id (stable for same id)', () => {
    const ulidId = ulid();
    const id = new UniqueEntityID(ulidId);

    const a1 = Account.create(
      { cpf: '11122233344', fullName: 'A', creditLimit: 0 },
      id,
    );
    const a2 = Account.create(
      { cpf: '55566677788', fullName: 'B', creditLimit: 0 },
      id,
    );
    expect(a1.number).toBeTypeOf('string');
    expect(a2.number).toBe(a1.number);
  });

  it('should likely produce different numbers for different ids', () => {
    const a1 = Account.create(
      { cpf: '11122233344', fullName: 'A', creditLimit: 0 },
      new UniqueEntityID(ulid()),
    );
    const a2 = Account.create(
      { cpf: '55566677788', fullName: 'B', creditLimit: 0 },
      new UniqueEntityID(ulid()),
    );
    expect(a1.number).not.toBe(a2.number);
  });
});
