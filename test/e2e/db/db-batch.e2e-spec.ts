import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { FakeConsumeQueue } from '../../fakes/fake-queue';
import { BatchQueue } from '../../fakes/batch-queue';
import { QUEUES } from '@/modules/transaction/async/messages';

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

describe('Batch processing + DB (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let batchQueue: BatchQueue;

  const acc = 'acc-batch-1';
  const acc2 = 'acc-batch-2';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(BatchQueue)
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    batchQueue = moduleRef.get(SendMessageToQueueProvider) as BatchQueue;
    await app.init();

    const now = new Date();
    await prisma.account.upsert({
      where: { id: acc },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: acc,
        number: '910001',
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.account.upsert({
      where: { id: acc2 },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: acc2,
        number: '910002',
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  test('Deposits em lote (10 itens) aplicam saldo e criam 10 transações', async () => {
    // Enfileira 10 depósitos de 1.23
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post(`/transactions/${acc}/deposit`)
        .send({ amount: 1.23, description: `d${i}` })
        .expect(202);
    }

    // Simula flush único em lote pelo consumidor
    const count = await batchQueue.flush(QUEUES.deposit);
    expect(count).toBe(10);

    // Aguarda persistência
    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id: acc } });
      return !!a && a.balanceCents === 12_30n;
    });
    const a = await prisma.account.findUnique({ where: { id: acc } });
    expect(a?.balanceCents).toBe(12_30n);

    const txCount = await prisma.transaction.count({
      where: { accountId: acc, type: 'DEPOSIT' },
    });
    expect(txCount).toBe(10);
    const leCount = await prisma.ledgerEntry.count({
      where: { accountId: acc },
    });
    expect(leCount).toBe(10);
  });

  test('Deposits em múltiplos lotes (flushInChunks)', async () => {
    // Enfileira 25 depósitos de 2.00 na mesma conta
    for (let i = 0; i < 25; i++) {
      await request(app.getHttpServer())
        .post(`/transactions/${acc2}/deposit`)
        .send({ amount: 2.0, description: `chunk-${i}` })
        .expect(202);
    }

    // Emite em lotes de 10 (simula prefetch/batching fracionado)
    const count = await batchQueue.flushInChunks(QUEUES.deposit, 10);
    expect(count).toBe(25);

    // Aguarda saldo final: 25 * 2.00 = 50.00
    await waitUntil(async () => {
      const a = await prisma.account.findUnique({ where: { id: acc2 } });
      return !!a && a.balanceCents === 50_00n;
    });
    const a = await prisma.account.findUnique({ where: { id: acc2 } });
    expect(a?.balanceCents).toBe(50_00n);

    const txCount = await prisma.transaction.count({
      where: { accountId: acc2, type: 'DEPOSIT' },
    });
    expect(txCount).toBe(25);
    const leCount = await prisma.ledgerEntry.count({
      where: { accountId: acc2 },
    });
    expect(leCount).toBe(25);
  });
});
