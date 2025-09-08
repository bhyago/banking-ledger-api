import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { FakeConsumeQueue, FakeSendQueue } from 'test/fakes/fake-queue';
import { QUEUES } from '@/modules/transaction/async/messages';
import { ULID } from 'test/ids';

describe('Transfer HTTP (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(FakeSendQueue)
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .compile();

    app = moduleRef.createNestApplication();
    // Queue providers são fakes; não inspecionamos internamente
    await app.init();

    // Ensure seed accounts exist in main DB
    const prisma = moduleRef.get(PrismaService);
    const now = new Date();
    const ensure = async (id: string, balance: bigint) =>
      prisma.account.upsert({
        where: { id },
        update: { balanceCents: balance, creditLimitCents: 0n, updatedAt: now },
        create: {
          id,
          number: id.slice(-6),
          balanceCents: balance,
          creditLimitCents: 0n,
          createdAt: now,
          updatedAt: now,
        },
      });
    await ensure(ULID.ACC1, 100_00n);
    await ensure(ULID.ACC2, 0n);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test('[POST] /transfer enfileira e retorna 202', async () => {
    const res = await request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440016')
      .send({
        fromAccountId: ULID.ACC1,
        toAccountId: ULID.ACC2,
        amount: 10,
        description: 'x',
      });

    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual(
      expect.objectContaining({
        queued: true,
        id: '550e8400-e29b-41d4-a716-446655440016',
      }),
    );
    // Request enfileirada com sucesso
  });

  test('[POST] /transfer valida schema (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/transfer')
      .send({ fromAccountId: 'A', toAccountId: 'A', amount: -1 });

    expect([400, 422]).toContain(res.statusCode);
  });
});
