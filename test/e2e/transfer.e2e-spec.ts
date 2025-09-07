import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../fakes/fake-queue';
import { QUEUES } from '@/modules/transaction/async/messages';

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
      .set('Idempotency-Key', 'idemp-tr-1')
      .send({
        fromAccountId: 'A',
        toAccountId: 'B',
        amount: 10,
        description: 'x',
      });

    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual(
      expect.objectContaining({ queued: true, id: 'idemp-tr-1' }),
    );
    expect(fakeQueue.published.at(-1)).toEqual(
      expect.objectContaining({
        queueName: QUEUES.transfer,
        object: expect.objectContaining({
          id: 'idemp-tr-1',
          fromAccountId: 'A',
          toAccountId: 'B',
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

  test('Transfer sem Idempotency-Key gera id e retorna 202', async () => {
    const res = await request(app.getHttpServer())
      .post('/transfer')
      .send({ fromAccountId: 'X', toAccountId: 'Y', amount: 2 });

    expect(res.statusCode).toBe(202);
    expect(res.body.queued).toBe(true);
    const id: string = res.body.id;
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);
    expect(fakeQueue.published.at(-1)?.object.id).toBe(id);
  });
});
