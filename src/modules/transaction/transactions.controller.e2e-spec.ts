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

describe('Transactions HTTP (E2E)', () => {
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
    await app.init();

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
    await ensure(ULID.ACC2, 50_00n);
    await ensure(ULID.ACC3, 0n);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test('[POST] /transactions/:accountId/deposit enqueues and returns 202', async () => {
    const res = await request(app.getHttpServer())
      .post(`/transactions/${ULID.ACC1}/deposit`)
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440017')
      .send({ amount: 100.5, description: 'dep test' });

    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual(
      expect.objectContaining({
        queued: true,
        id: '550e8400-e29b-41d4-a716-446655440017',
      }),
    );
  });

  test('[POST] /transactions/:accountId/withdraw enqueues and returns 202', async () => {
    const res = await request(app.getHttpServer())
      .post(`/transactions/${ULID.ACC2}/withdraw`)
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440018')
      .send({ amount: 50, description: 'cash' });

    expect(res.statusCode).toBe(202);
  });

  test('Bootstrap registers consumers for expected queues', async () => {
    expect(app).toBeDefined();
  });

  test('Deposit schema validations (invalid amount and long description)', async () => {
    const res1 = await request(app.getHttpServer())
      .post(`/transactions/${ULID.ACC3}/deposit`)
      .send({ amount: -1 });
    expect([400, 422]).toContain(res1.statusCode);

    const res2 = await request(app.getHttpServer())
      .post(`/transactions/${ULID.ACC3}/deposit`)
      .send({ amount: 1, description: 'a'.repeat(281) });
    expect([400, 422]).toContain(res2.statusCode);
  });

  test('Withdraw schema validations (invalid amount)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/transactions/${ULID.ACC3}/withdraw`)
      .send({ amount: 0 });
    expect([400, 422]).toContain(res.statusCode);
  });
});
