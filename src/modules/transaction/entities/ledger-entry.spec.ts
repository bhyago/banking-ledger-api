import { describe, it, expect } from 'vitest';
import { LedgerEntry } from './ledger-entry';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { ULID } from 'test/ids';

describe('LedgerEntry Entity', () => {
  it('should create with defaults and expose getters', () => {
    const accountId = new UniqueEntityID(ULID.ACC1);
    const transactionId = new UniqueEntityID(ULID.TX1);
    const transferId = new UniqueEntityID(ULID.TR1);

    const entry = LedgerEntry.create({
      accountId,
      transactionId,
      transferId,
      debit: 10,
      credit: 0,
      balanceAfter: 90,
    });

    expect(entry.accountId.toValue()).toBe(ULID.ACC1);
    expect(entry.transactionId?.toValue()).toBe(ULID.TX1);
    expect(entry.transferId?.toValue()).toBe(ULID.TR1);
    expect(entry.debit).toBe(10);
    expect(entry.credit).toBe(0);
    expect(entry.balanceAfter).toBe(90);
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('should allow null transactionId and transferId', () => {
    const entry = LedgerEntry.create({
      accountId: new UniqueEntityID(ULID.ACC2),
      debit: 0,
      credit: 50,
      balanceAfter: 150,
    });

    expect(entry.transactionId).toBeNull();
    expect(entry.transferId).toBeNull();
    expect(entry.credit).toBe(50);
  });
});
