import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { InProcessEmitQueue } from '../../fakes/inprocess-queue';
import { FakeConsumeQueue } from '../../fakes/fake-queue';

async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = 2000,
  step = 50,
) {
  const start = Date.now();

  while (true) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) return;
    await new Promise((r) => setTimeout(r, step));
  }
}

describe('Idempotency (E2E + DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(InProcessEmitQueue)
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('Duplicate deposit with same Idempotency-Key applies only once', async () => {
    const id = 'acc-idepo-1';
    const now = new Date();
    await prisma.account.upsert({
      where: { id },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id,
        number: '920001',
        balanceCents: 100_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = 'dup-deposit-1';
    await request(app.getHttpServer())
      .post(`/transactions/${id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: 20 })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/transactions/${id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: 20 })
      .expect(202);

    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id } });
      return !!a && a.balanceCents === 120_00n;
    });
    const a = await prisma.account.findUnique({ where: { id } });
    expect(a?.balanceCents).toBe(120_00n);

    // Only one transaction/ledger
    const txCount = await prisma.transaction.count({
      where: { accountId: id, type: 'DEPOSIT' },
    });
    const leCount = await prisma.ledgerEntry.count({
      where: { accountId: id },
    });
    expect(txCount).toBe(1);
    expect(leCount).toBe(1);
  });

  test('Duplicate withdraw with same Idempotency-Key applies only once', async () => {
    const id = 'acc-iwith-1';
    const now = new Date();
    await prisma.account.upsert({
      where: { id },
      update: { balanceCents: 200_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id,
        number: '920002',
        balanceCents: 200_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = 'dup-withdraw-1';
    await request(app.getHttpServer())
      .post(`/transactions/${id}/withdraw`)
      .set('Idempotency-Key', key)
      .send({ amount: 30 })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/transactions/${id}/withdraw`)
      .set('Idempotency-Key', key)
      .send({ amount: 30 })
      .expect(202);

    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id } });
      return !!a && a.balanceCents === 170_00n;
    });
    const a = await prisma.account.findUnique({ where: { id } });
    expect(a?.balanceCents).toBe(170_00n);
    const txCount = await prisma.transaction.count({
      where: { accountId: id, type: 'WITHDRAW' },
    });
    const leCount = await prisma.ledgerEntry.count({
      where: { accountId: id },
    });
    expect(txCount).toBe(1);
    expect(leCount).toBe(1);
  });

  test('Duplicate transfer with same Idempotency-Key applies only once', async () => {
    const from = 'acc-itran-1';
    const to = 'acc-itran-2';
    const now = new Date();
    await prisma.account.upsert({
      where: { id: from },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: from,
        number: '920003',
        balanceCents: 100_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.account.upsert({
      where: { id: to },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: to,
        number: '920004',
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = 'dup-transfer-1';
    await request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', key)
      .send({ fromAccountId: from, toAccountId: to, amount: 40 })
      .expect(202);
    await request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', key)
      .send({ fromAccountId: from, toAccountId: to, amount: 40 })
      .expect(202);

    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id: from } });
      const b = await prisma.account.findUnique({ where: { id: to } });
      return (
        !!a && !!b && a.balanceCents === 60_00n && b.balanceCents === 40_00n
      );
    });
    const a = await prisma.account.findUnique({ where: { id: from } });
    const b = await prisma.account.findUnique({ where: { id: to } });
    expect(a?.balanceCents).toBe(60_00n);
    expect(b?.balanceCents).toBe(40_00n);

    // Two transactions (from/to) only once
    const txFrom = await prisma.transaction.count({
      where: { accountId: from, type: 'TRANSFER' },
    });
    const txTo = await prisma.transaction.count({
      where: { accountId: to, type: 'TRANSFER' },
    });
    expect(txFrom).toBe(1);
    expect(txTo).toBe(1);
    // Ledger entries: one per side
    const leFrom = await prisma.ledgerEntry.count({
      where: { accountId: from },
    });
    const leTo = await prisma.ledgerEntry.count({ where: { accountId: to } });
    expect(leFrom).toBe(1);
    expect(leTo).toBe(1);
  });
});
