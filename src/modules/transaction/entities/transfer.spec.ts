import { describe, it, expect } from 'vitest';
import { Transfer } from './transfer';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { TransferStatus } from './enums';
import { randomUUID } from 'crypto';

describe('Transfer Entity', () => {
  it('should create with defaults (status APPLIED, feeFrom 0) and getters', () => {
    const uuid = randomUUID();
    const from = new UniqueEntityID('from-1');
    const to = new UniqueEntityID('to-1');
    const tr = Transfer.create({
      fromAccountId: from,
      toAccountId: to,
      amount: 75,
      idempotencyKey: uuid,
    });

    expect(tr.fromAccountId.toValue()).toBe('from-1');
    expect(tr.toAccountId.toValue()).toBe('to-1');
    expect(tr.amount).toBe(75);
    expect(tr.feeFrom).toBe(0);
    expect(tr.status).toBe(TransferStatus.APPLIED);
    expect(tr.createdAt).toBeInstanceOf(Date);
  });

  it('should accept feeFrom override', () => {
    const uuid = randomUUID();
    const tr = Transfer.create({
      fromAccountId: new UniqueEntityID('from-2'),
      toAccountId: new UniqueEntityID('to-2'),
      amount: 100,
      idempotencyKey: uuid,
      feeFrom: 2.25,
    });

    expect(tr.feeFrom).toBe(2.25);
  });
});
