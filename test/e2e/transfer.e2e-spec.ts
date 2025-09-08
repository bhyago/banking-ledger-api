import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../fakes/fake-queue';
import { QUEUES } from '@/modules/transaction/async/messages';
import { ULID } from 'test/ids';

describe('Transfer HTTP (E2E)', () => {
  let app: INestApplication;
  let fakeQueue: FakeSendQueue;
  let fakeConsumer: FakeConsumeQueue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: async () => {}, $disconnect: async () => {} })
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(FakeSendQueue)
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .compile();

    app = moduleRef.createNestApplication();
    fakeQueue = moduleRef.get(SendMessageToQueueProvider) as FakeSendQueue;
    fakeConsumer = moduleRef.get(
      ConsumeMessageFromQueueProvider,
    ) as FakeConsumeQueue;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
    expect(fakeQueue.published.at(-1)).toEqual(
      expect.objectContaining({
        queueName: QUEUES.transfer,
        object: expect.objectContaining({
          id: '550e8400-e29b-41d4-a716-446655440016',
          fromAccountId: ULID.ACC1,
          toAccountId: ULID.ACC2,
          amount: 10,
          description: 'x',
        }),
      }),
    );
  });

  test('[POST] /transfer valida schema (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/transfer')
      .send({ fromAccountId: 'A', toAccountId: 'A', amount: -1 });

    expect([400, 422]).toContain(res.statusCode);
  });

  // Cenário sem Idempotency-Key removido; guard exige header
});
