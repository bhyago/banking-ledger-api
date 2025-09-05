import { describe, it, expect } from 'vitest';
import { Transaction } from './transaction';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { TransactionStatus, TransactionType } from './enums';

describe('Transaction Entity', () => {
  it('should create with defaults (status APPLIED, fee 0) and getters', () => {
    const accountId = new UniqueEntityID('acc-1');
    const tx = Transaction.create({
      accountId,
      type: TransactionType.DEPOSIT,
      amount: 200,
      description: 'Initial deposit',
    });

    expect(tx.accountId.toValue()).toBe('acc-1');
    expect(tx.type).toBe(TransactionType.DEPOSIT);
    expect(tx.amount).toBe(200);
    expect(tx.fee).toBe(0);
    expect(tx.description).toBe('Initial deposit');
    expect(tx.status).toBe(TransactionStatus.APPLIED);
    expect(tx.createdAt).toBeInstanceOf(Date);
  });

  it('should accept optional relatedAccountId and transferId and fee override', () => {
    const accountId = new UniqueEntityID('acc-1');
    const relatedAccountId = new UniqueEntityID('acc-2');
    const transferId = new UniqueEntityID('tr-1');

    const tx = Transaction.create({
      accountId,
      type: TransactionType.TRANSFER,
      amount: 50,
      fee: 1.5,
      relatedAccountId,
      transferId,
      description: 'Transfer to savings',
    });

    expect(tx.relatedAccountId?.toValue()).toBe('acc-2');
    expect(tx.transferId?.toValue()).toBe('tr-1');
    expect(tx.fee).toBe(1.5);
  });
});
