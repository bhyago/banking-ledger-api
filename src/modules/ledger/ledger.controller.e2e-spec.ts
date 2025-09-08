import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { AccountTransactionService } from '@/modules/transaction/services/account-transaction.service';
import { randomUUID } from 'crypto';
import { ULID } from 'test/ids';
import { ulid } from 'ulid';

describe('LedgerController (E2E)', () => {
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
    if (app) await app.close();
  });

  test('404 para conta inexistente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/accounts/${ULID.ACC8}/ledger`)
      .query({ page: 1, perPage: 10, order: 'asc' });
    expect(res.statusCode).toBe(404);
  });

  test('lista lançamentos com paginação e ordenação', async () => {
    // use a fresh ULID to avoid interference with previous runs
    const accountId = ulid();
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
        totalPages: 1,
        order: 'asc',
      }),
    );
  });
});
