import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { InProcessEmitQueue } from '../../fakes/inprocess-queue';
import { FakeConsumeQueue } from '../../fakes/fake-queue';
import { QUEUES } from '@/modules/transaction/async/messages';

async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (t: T) => boolean,
  timeoutMs = 2000,
  intervalMs = 50,
): Promise<T> {
  const start = Date.now();

  while (true) {
    const v = await fn();
    if (predicate(v)) return v;
    if (Date.now() - start > timeoutMs) return v;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

describe('Transactions + DB (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const accA = 'acc-db-A';
  const accB = 'acc-db-B';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(InProcessEmitQueue)
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();

    // Seed mínimo via PrismaService
    const now = new Date();
    await prisma.account.upsert({
      where: { id: accA },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accA,
        number: '900001',
        balanceCents: 100_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.account.upsert({
      where: { id: accB },
      update: { balanceCents: 50_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accB,
        number: '900002',
        balanceCents: 50_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  test('Deposit aplica no banco e gera ledger/transaction', async () => {
    const res = await request(app.getHttpServer())
      .post(`/transactions/${accA}/deposit`)
      .set('Idempotency-Key', 'db-idemp-1')
      .send({ amount: 25.5, description: 'dep db' });
    expect(res.statusCode).toBe(202);

    const acc = await waitFor(
      () => prisma.account.findUnique({ where: { id: accA } }),
      (a) => !!a && a.balanceCents === 125_50n,
    );
    expect(acc?.balanceCents).toBe(125_50n);

    const tx = await prisma.transaction.findFirst({
      where: { accountId: accA, type: 'DEPOSIT' },
    });
    expect(tx).toBeTruthy();
    const le = await prisma.ledgerEntry.findFirst({
      where: { accountId: accA, transactionId: tx!.id },
    });
    expect(le).toBeTruthy();
  });

  test('Withdraw aplica no banco e gera ledger/transaction', async () => {
    const res = await request(app.getHttpServer())
      .post(`/transactions/${accA}/withdraw`)
      .send({ amount: 20, description: 'cash db' });
    expect(res.statusCode).toBe(202);

    const acc = await waitFor(
      () => prisma.account.findUnique({ where: { id: accA } }),
      (a) => !!a && a.balanceCents === 105_50n,
    );
    expect(acc?.balanceCents).toBe(105_50n);

    const tx = await prisma.transaction.findFirst({
      where: { accountId: accA, type: 'WITHDRAW' },
    });
    expect(tx).toBeTruthy();
    const le = await prisma.ledgerEntry.findFirst({
      where: { accountId: accA, transactionId: tx!.id },
    });
    expect(le).toBeTruthy();
  });

  test('Transfer aplica no banco (debita A e credita B)', async () => {
    const res = await request(app.getHttpServer()).post('/transfer').send({
      fromAccountId: accA,
      toAccountId: accB,
      amount: 5,
      description: 'tr db',
    });
    expect(res.statusCode).toBe(202);

    const a = await waitFor(
      () => prisma.account.findUnique({ where: { id: accA } }),
      (v) => !!v && v.balanceCents === 100_50n,
    );
    const b = await waitFor(
      () => prisma.account.findUnique({ where: { id: accB } }),
      (v) => !!v && v.balanceCents === 55_00n,
    );
    expect(a?.balanceCents).toBe(100_50n);
    expect(b?.balanceCents).toBe(55_00n);

    const txFrom = await prisma.transaction.findFirst({
      where: { accountId: accA, type: 'TRANSFER' },
    });
    const txTo = await prisma.transaction.findFirst({
      where: { accountId: accB, type: 'TRANSFER' },
    });
    expect(txFrom && txTo).toBeTruthy();
    const leFrom = await prisma.ledgerEntry.findFirst({
      where: { accountId: accA, transactionId: txFrom!.id },
    });
    const leTo = await prisma.ledgerEntry.findFirst({
      where: { accountId: accB, transactionId: txTo!.id },
    });
    expect(leFrom && leTo).toBeTruthy();
  });
});
