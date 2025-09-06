import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../fakes/fake-queue';
import { QUEUES } from '@/modules/transaction/async/messages';

describe('Transactions HTTP (E2E)', () => {
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

  test('[POST] /transactions/:accountId/deposit enfileira e retorna 202', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions/acc-123/deposit')
      .set('Idempotency-Key', 'idemp-1')
      .send({ amount: 100.5, description: 'dep test' });

    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual(
      expect.objectContaining({ queued: true, id: 'idemp-1' }),
    );
    expect(fakeQueue.published).toContainEqual(
      expect.objectContaining({
        queueName: QUEUES.deposit,
        object: expect.objectContaining({
          id: 'idemp-1',
          accountId: 'acc-123',
          amount: 100.5,
          description: 'dep test',
        }),
      }),
    );
  });

  test('[POST] /transactions/:accountId/withdraw enfileira e retorna 202', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions/acc-555/withdraw')
      .send({ amount: 50, description: 'cash' });

    expect(res.statusCode).toBe(202);
    // id gerado será uuid; apenas checamos queue
    expect(fakeQueue.published.at(-1)).toEqual(
      expect.objectContaining({
        queueName: QUEUES.withdraw,
        object: expect.objectContaining({
          accountId: 'acc-555',
          amount: 50,
          description: 'cash',
        }),
      }),
    );
  });

  test('Bootstrap registra consumidores das filas esperadas', async () => {
    // TransactionQueueBootstrap roda no onModuleInit; fakeConsumer captura
    const names = new Set(fakeConsumer.started.map((s) => s.queueName));
    expect(names.has(QUEUES.deposit)).toBeTruthy();
    expect(names.has(QUEUES.withdraw)).toBeTruthy();
    expect(names.has(QUEUES.transfer)).toBeTruthy();
  });

  test('Deposit sem Idempotency-Key gera id e retorna 202', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions/acc-777/deposit')
      .send({ amount: 1 });

    expect(res.statusCode).toBe(202);
    expect(res.body.queued).toBe(true);
    const id: string = res.body.id;
    expect(typeof id).toBe('string');
    // id do Node randomUUID: 36 chars com hifens
    expect(id.length).toBe(36);
    // Published deve conter o mesmo id
    expect(fakeQueue.published.at(-1)?.object.id).toBe(id);
  });

  test('Deposit validações de schema (amount inválido e descrição longa)', async () => {
    const res1 = await request(app.getHttpServer())
      .post('/transactions/acc-x/deposit')
      .send({ amount: -1 });
    expect([400, 422]).toContain(res1.statusCode);

    const res2 = await request(app.getHttpServer())
      .post('/transactions/acc-x/deposit')
      .send({ amount: 1, description: 'a'.repeat(281) });
    expect([400, 422]).toContain(res2.statusCode);
  });

  test('Withdraw validações de schema (amount inválido)', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions/acc-x/withdraw')
      .send({ amount: 0 });
    expect([400, 422]).toContain(res.statusCode);
  });
});
