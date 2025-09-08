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

describe('TransactionController (Integration + DB)', () => {
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

  test('rejects missing Idempotency-Key header (deposit)', async () => {
    const accId = ULID.ACC1;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accId },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accId,
        number: accId.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    await request(app.getHttpServer())
      .post(`/transactions/${accId}/deposit`)
      .send({ amount: 10 })
      .expect(400);
  });

  test('rejects invalid Idempotency-Key UUID (deposit)', async () => {
    const accId = ULID.ACC2;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accId },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accId,
        number: accId.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    await request(app.getHttpServer())
      .post(`/transactions/${accId}/deposit`)
      .set('Idempotency-Key', 'not-a-uuid')
      .send({ amount: 10 })
      .expect(400);
  });

  test('deposit applies and is idempotent', async () => {
    const accId = ULID.ACC3;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accId },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accId,
        number: accId.slice(-6),
        balanceCents: 100_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = '550e8400-e29b-41d4-a716-446655440000';
    await request(app.getHttpServer())
      .post(`/transactions/${accId}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: 25 })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/transactions/${accId}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: 25 })
      .expect(202);

    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id: accId } });
      return !!a && a.balanceCents === 125_00n;
    });
    const a = await prisma.account.findUnique({ where: { id: accId } });
    expect(a?.balanceCents).toBe(125_00n);

    const txCount = await prisma.transaction.count({
      where: { accountId: accId, type: 'DEPOSIT' },
    });
    expect(txCount).toBe(1);
  });

  test('withdraw applies and is idempotent', async () => {
    const accId = ULID.ACC4;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accId },
      update: { balanceCents: 200_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accId,
        number: accId.slice(-6),
        balanceCents: 200_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = '550e8400-e29b-41d4-a716-446655440001';
    await request(app.getHttpServer())
      .post(`/transactions/${accId}/withdraw`)
      .set('Idempotency-Key', key)
      .send({ amount: 40 })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/transactions/${accId}/withdraw`)
      .set('Idempotency-Key', key)
      .send({ amount: 40 })
      .expect(202);

    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id: accId } });
      return !!a && a.balanceCents === 160_00n;
    });
    const a = await prisma.account.findUnique({ where: { id: accId } });
    expect(a?.balanceCents).toBe(160_00n);

    const txCount = await prisma.transaction.count({
      where: { accountId: accId, type: 'WITHDRAW' },
    });
    expect(txCount).toBe(1);
  });

  test('withdraw with insufficient funds returns 422 and does not change balance', async () => {
    const accId = ULID.ACC5;
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accId },
      update: { balanceCents: 10_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accId,
        number: accId.slice(-6),
        balanceCents: 10_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const key = '550e8400-e29b-41d4-a716-446655440002';
    await request(app.getHttpServer())
      .post(`/transactions/${accId}/withdraw`)
      .set('Idempotency-Key', key)
      .send({ amount: 50 })
      .expect(422);

    const a = await prisma.account.findUnique({ where: { id: accId } });
    expect(a?.balanceCents).toBe(10_00n);
  });
});
