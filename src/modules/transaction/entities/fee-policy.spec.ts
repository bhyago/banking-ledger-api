import { describe, it, expect } from 'vitest';
import { FeePolicy } from './fee-policy';
import { TransactionType } from './enums';
import { DateTime } from 'luxon';

describe('FeePolicy Entity', () => {
  it('should create with getters and active window inclusive', () => {
    const startsAt = DateTime.utc().minus({ days: 1 }).toJSDate();
    const endsAt = DateTime.utc().plus({ days: 1 }).toJSDate();
    const policy = FeePolicy.create({
      transactionType: TransactionType.DEPOSIT,
      flatFee: 2,
      percentBps: 150, // 1.5%
      startsAt,
      endsAt,
    });

    expect(policy.transactionType).toBe(TransactionType.DEPOSIT);
    expect(policy.flatFee).toBe(2);
    expect(policy.percentBps).toBe(150);
    expect(policy.startsAt).toEqual(startsAt);
    expect(policy.endsAt).toEqual(endsAt);

    expect(policy.isActive(startsAt)).toBe(true);
    expect(policy.isActive(endsAt)).toBe(true);
    expect(policy.isActive(DateTime.utc().toJSDate())).toBe(true);
  });

  it('should not be active outside window and calculate fee correctly', () => {
    const startsAt = new Date('2025-01-01T00:00:00Z');
    const endsAt = new Date('2025-01-31T23:59:59Z');
    const policy = FeePolicy.create({
      transactionType: TransactionType.WITHDRAW,
      flatFee: 1.25,
      percentBps: 200, // 2%
      startsAt,
      endsAt,
    });

    expect(policy.isActive(new Date('2024-12-31T23:59:59Z'))).toBe(false);
    expect(policy.isActive(new Date('2025-02-01T00:00:00Z'))).toBe(false);

    // 2% of 100 = 2, + 1.25 = 3.25
    expect(policy.calculate(100)).toBeCloseTo(3.25, 6);
  });
});
