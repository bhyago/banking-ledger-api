import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAccountLedgerUseCase } from './get-account-ledger';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { accountErrors } from '@/modules/account/errors/account-errors';

const makePrisma = () => {
  return {
    account: {
      findUnique: vi.fn(),
    },
    ledgerEntry: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as PrismaService;
};

describe('GetAccountLedgerUseCase', () => {
  let prisma: PrismaService;
  let useCase: GetAccountLedgerUseCase;

  beforeEach(() => {
    prisma = makePrisma();
    useCase = new GetAccountLedgerUseCase(prisma);
  });

  it('should throw AccountNotFoundError when account does not exist', async () => {
    (prisma.account.findUnique as any).mockResolvedValueOnce(null);

    await expect(() =>
      useCase.execute({
        accountId: '01J7YQ3K9Y9Z2R9Q9ZQ9ZQ9ZQ9',
        page: 1,
        perPage: 10,
        order: 'asc',
      } as any),
    ).rejects.toThrow(accountErrors.AccountNotFoundError);

    expect(prisma.account.findUnique).toHaveBeenCalledOnce();
    expect(prisma.ledgerEntry.count).not.toHaveBeenCalled();
    expect(prisma.ledgerEntry.findMany).not.toHaveBeenCalled();
  });

  it('should list ledger entries with pagination meta (asc)', async () => {
    (prisma.account.findUnique as any).mockResolvedValueOnce({ id: 'acc-1' });
    (prisma.ledgerEntry.count as any).mockResolvedValueOnce(3);
    const now = new Date();
    (prisma.ledgerEntry.findMany as any).mockResolvedValueOnce([
      {
        id: '01LEDGER1',
        accountId: 'acc-1',
        transactionId: '01TX1',
        transferId: null,
        debitCents: BigInt(0),
        creditCents: BigInt(12345),
        balanceAfterCents: BigInt(20000),
        createdAt: now,
      },
      {
        id: '01LEDGER2',
        accountId: 'acc-1',
        transactionId: null,
        transferId: '01TR1',
        debitCents: BigInt(5000),
        creditCents: BigInt(0),
        balanceAfterCents: BigInt(15000),
        createdAt: now,
      },
    ]);

    const result = await useCase.execute({
      accountId: 'acc-1',
      page: 1,
      perPage: 2,
      order: 'asc',
    } as any);

    expect(result.accountId).toBe('acc-1');
    expect(result.ledger).toHaveLength(2);
    expect(result.ledger[0]).toEqual(
      expect.objectContaining({
        id: '01LEDGER1',
        description: null,
        amount: 123.45,
        balanceAfterCents: 200,
        createdAt: now,
        type: 'credit',
        transactionId: '01TX1',
        transferId: null,
        currency: 'BRL',
      }),
    );
    expect(result.ledger[1]).toEqual(
      expect.objectContaining({
        id: '01LEDGER2',
        amount: 50,
        type: 'debit',
        transactionId: null,
        transferId: '01TR1',
      }),
    );

    expect(result.meta).toEqual({
      page: 1,
      perPage: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
      hasPrevious: false,
      order: 'asc',
    });

    expect(prisma.ledgerEntry.count).toHaveBeenCalledWith({
      where: { accountId: 'acc-1' },
    });
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith({
      where: { accountId: 'acc-1' },
      orderBy: { createdAt: 'asc' },
      skip: 0,
      take: 2,
    });
  });

  it('should compute skip/take and meta for last page (desc)', async () => {
    (prisma.account.findUnique as any).mockResolvedValueOnce({ id: 'acc-1' });
    (prisma.ledgerEntry.count as any).mockResolvedValueOnce(3);
    (prisma.ledgerEntry.findMany as any).mockResolvedValueOnce([
      {
        id: '01LEDGER3',
        accountId: 'acc-1',
        transactionId: null,
        transferId: null,
        debitCents: BigInt(0),
        creditCents: BigInt(100),
        balanceAfterCents: BigInt(12300),
        createdAt: new Date(),
      },
    ]);

    const input = {
      accountId: 'acc-1',
      page: 2,
      perPage: 2,
      order: 'desc',
    } as any;
    const result = await useCase.execute(input);

    expect(result.meta).toEqual({
      page: 2,
      perPage: 2,
      total: 3,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
      order: 'desc',
    });

    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith({
      where: { accountId: 'acc-1' },
      orderBy: { createdAt: 'desc' },
      skip: 2,
      take: 2,
    });
  });
});
