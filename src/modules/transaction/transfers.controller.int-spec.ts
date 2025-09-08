import '@/../test/setup-e2e';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { InProcessEmitQueue } from '@/../test/fakes/inprocess-queue';
import { FakeConsumeQueue } from '@/../test/fakes/fake-queue';
import { ULID } from 'test/ids';

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

describe('TransferController (Integration + DB)', () => {
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

  test('rejects missing Idempotency-Key header', async () => {
    await request(app.getHttpServer())
      .post('/transfer')
      .send({ fromAccountId: 'a', toAccountId: 'b', amount: 10 })
      .expect(400);
  });

  test('transfer applies and is idempotent', async () => {
    const from = ULID.ACC1;
    const to = ULID.ACC2;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: from },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: from,
        number: from.slice(-6),
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
        number: to.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = '550e8400-e29b-41d4-a716-446655440003';
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

    const txFrom = await prisma.transaction.count({
      where: { accountId: from, type: 'TRANSFER' },
    });
    const txTo = await prisma.transaction.count({
      where: { accountId: to, type: 'TRANSFER' },
    });
    expect(txFrom).toBe(1);
    expect(txTo).toBe(1);
  });

  test('rejects transfer to same account with 400', async () => {
    const from = ULID.ACC3;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: from },
      update: { balanceCents: 50_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: from,
        number: from.slice(-6),
        balanceCents: 50_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = '550e8400-e29b-41d4-a716-446655440004';
    await request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', key)
      .send({ fromAccountId: from, toAccountId: from, amount: 10 })
      .expect(400);
  });

  test('insufficient funds returns 422 and keeps balances', async () => {
    const from = ULID.ACC4;
    const to = ULID.ACC5;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: from },
      update: { balanceCents: 10_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: from,
        number: '990009',
        balanceCents: 10_00n,
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
        number: to.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const fromBefore = await prisma.account.findUnique({ where: { id: from } });
    const toBefore = await prisma.account.findUnique({ where: { id: to } });

    await request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440099')
      .send({ fromAccountId: from, toAccountId: to, amount: 50 })
      .expect(422);

    const fromAfter = await prisma.account.findUnique({ where: { id: from } });
    const toAfter = await prisma.account.findUnique({ where: { id: to } });
    expect(fromAfter?.balanceCents).toBe(fromBefore?.balanceCents);
    expect(toAfter?.balanceCents).toBe(toBefore?.balanceCents);
  });
});
