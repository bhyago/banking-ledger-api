import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../../fakes/fake-queue';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { QUEUES } from '@/modules/transaction/async/messages';
import { TransferUseCase } from '@/modules/transaction/usecases/transfer';
import { transactionErrors } from '@/modules/transaction/errors/transaction-errors';

describe('Transfer HTTP + Processing Concurrency (E2E-DB)', () => {
  let app: INestApplication;
  let fakeQueue: FakeSendQueue;
  let prisma: PrismaService;

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
    fakeQueue = moduleRef.get(SendMessageToQueueProvider) as FakeSendQueue;
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('Two concurrent transfers from same account serialize; only one succeeds', async () => {
    const fromId = 'acc-001'; // seeded with 100.00
    const to1Id = 'acc-002';
    const to2Id = 'acc-003';

    const fromBefore = await prisma.account.findUnique({
      where: { id: fromId },
    });
    expect(fromBefore).not.toBeNull();
    expect(Number(fromBefore!.balanceCents)).toBe(10000);

    const r1 = request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', 'e2e-conc-1')
      .send({ fromAccountId: fromId, toAccountId: to1Id, amount: 70 });
    const r2 = request(app.getHttpServer())
      .post('/transfer')
      .set('Idempotency-Key', 'e2e-conc-2')
      .send({ fromAccountId: fromId, toAccountId: to2Id, amount: 70 });

    const [res1, res2] = await Promise.all([r1, r2]);
    expect(res1.statusCode).toBe(202);
    expect(res2.statusCode).toBe(202);

    const usecase = app.get(TransferUseCase);
    const msgs = fakeQueue.published
      .filter((m) => m.queueName === QUEUES.transfer)
      .map((m) => m.object)
      .filter((o: any) => o.fromAccountId === fromId && o.amount === 70);
    expect(msgs.length).toBeGreaterThanOrEqual(2);

    const [m1, m2] = msgs.slice(-2);
    const p1 = usecase.execute(m1 as any);
    const p2 = usecase.execute(m2 as any);

    const [a, b] = await Promise.allSettled([p1, p2]);
    const fulfilled = [a, b].filter((r) => r.status === 'fulfilled') as Array<
      PromiseFulfilledResult<any>
    >;
    const rejected = [a, b].filter(
      (r) => r.status === 'rejected',
    ) as Array<PromiseRejectedResult>;

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    const from = await prisma.account.findUnique({ where: { id: fromId } });
    const to1 = await prisma.account.findUnique({ where: { id: to1Id } });
    const to2 = await prisma.account.findUnique({ where: { id: to2Id } });

    expect(Number(from!.balanceCents)).toBe(3000);
    const credited = [to1!, to2!].map((a) => Number(a.balanceCents));
    expect(credited).toEqual(expect.arrayContaining([7000, 0]));
  });
});
