import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { TransferUseCase } from '@/modules/transaction/usecases/transfer';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../../fakes/fake-queue';
import { transactionErrors } from '@/modules/transaction/errors/transaction-errors';

describe('Transfer Integration DB (UseCase + Prisma)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let usecase: TransferUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(FakeSendQueue)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    usecase = moduleRef.get(TransferUseCase);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serializes two transfers from same account (DB-backed)', async () => {
    const fromId = 'acc-001';
    const to1Id = 'acc-002';
    const to2Id = 'acc-003';

    const acc = await prisma.account.findUnique({ where: { id: fromId } });
    expect(acc).not.toBeNull();
    expect(Number(acc!.balanceCents)).toBe(10000);

    const p1 = usecase.execute({
      id: 'intdb-1',
      fromAccountId: fromId,
      toAccountId: to1Id,
      amount: 70,
      description: 'db1',
      idempotencyKey: 'intdb-1',
    } as any);
    const p2 = usecase.execute({
      id: 'intdb-2',
      fromAccountId: fromId,
      toAccountId: to2Id,
      amount: 70,
      description: 'db2',
      idempotencyKey: 'intdb-2',
    } as any);

    const [a, b] = await Promise.allSettled([p1, p2]);
    const fulfilled = [a, b].filter((r) => r.status === 'fulfilled');
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
    // Exactly one destination credited +7000 cents
    const credits = [Number(to1!.balanceCents), Number(to2!.balanceCents)];
    expect(credits).toEqual(expect.arrayContaining([7000, 0]));
  });
});
