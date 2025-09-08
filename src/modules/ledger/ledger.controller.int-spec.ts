import '@/../test/setup-e2e';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { ULID } from 'test/ids';
import { AccountTransactionService } from '@/modules/transaction/services/account-transaction.service';
import { randomUUID } from 'crypto';

describe('LedgerController (Integration + DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tx: AccountTransactionService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    tx = moduleRef.get(AccountTransactionService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('returns 404 for unknown account', async () => {
    const res = await request(app.getHttpServer())
      .get(`/accounts/${ULID.ACC8}/ledger`)
      .query({ page: 1, perPage: 10, order: 'asc' });
    expect(res.statusCode).toBe(404);
  });

  test('lists ledger entries with pagination (asc)', async () => {
    const accountId = ULID.ACC6;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accountId },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accountId,
        number: accountId.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.deposit({ accountId, amount: 10, idempotencyKey: randomUUID() });
    await tx.withdraw({
      accountId,
      amount: 4,
      idempotencyKey: randomUUID(),
    } as any);

    const res = await request(app.getHttpServer())
      .get(`/accounts/${accountId}/ledger`)
      .query({ page: 1, perPage: 2, order: 'asc' });
    expect(res.statusCode).toBe(200);
    expect(res.body.accountId).toBe(accountId);
    expect(res.body.ledger).toHaveLength(2);
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        perPage: 2,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        order: 'asc',
      }),
    );
    // First is the deposit (credit 10.00)
    expect(res.body.ledger[0]).toEqual(
      expect.objectContaining({ type: 'credit', amount: 10, currency: 'BRL' }),
    );
    // Second is the withdraw (debit total including fee)
    expect(res.body.ledger[1]).toEqual(
      expect.objectContaining({ type: 'debit', currency: 'BRL' }),
    );
  });

  test('validates query params and returns 422', async () => {
    const res = await request(app.getHttpServer())
      .get(`/accounts/${ULID.ACC6}/ledger`)
      .query({ page: 0, perPage: 0, order: 'wrong' });
    expect([400, 422]).toContain(res.statusCode);
  });
});
