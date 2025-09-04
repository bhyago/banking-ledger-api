import { describe, it, expect } from 'vitest';
import { Account } from './account';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { ulid } from 'ulid';

describe('Account Entity', () => {
  it('should create an account with default values', () => {
    const account = Account.create({});
    expect(account.balance).toBe(0);
    expect(account.creditLimit).toBe(0);
    expect(account.number).toBeTypeOf('string');
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.updatedAt).toBeInstanceOf(Date);
    expect(account.deletedAt).toBeNull();
  });

  it('should allow setting and getting properties', () => {
    const account = Account.create({});
    account.balance = 1000;
    account.creditLimit = 500;
    account.number = '123456';
    account.deletedAt = new Date('2025-09-03T00:00:00Z');

    expect(account.balance).toBe(1000);
    expect(account.creditLimit).toBe(500);
    expect(account.number).toBe('123456');
    expect(account.deletedAt).toEqual(new Date('2025-09-03T00:00:00Z'));
  });

  it('should update updatedAt when touch is called', () => {
    const account = Account.create({});
    const oldUpdatedAt = account.updatedAt;
    account['touch']();
    expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(
      oldUpdatedAt.getTime(),
    );
  });

  it('should generate account number from id', () => {
    const ulidId = ulid();
    const id = new UniqueEntityID(ulidId);

    const account = Account.create({}, id);
    expect(account.number).toBeTypeOf('string');
  });
});
