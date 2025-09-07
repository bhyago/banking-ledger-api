import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../../fakes/fake-queue';
import { DepositUseCase } from '@/modules/transaction/usecases/deposit';
import { WithdrawUseCase } from '@/modules/transaction/usecases/withdraw';

describe('Idempotency (Deposit & Withdraw) - DB', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let deposit: DepositUseCase;
  let withdraw: WithdrawUseCase;

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
    deposit = moduleRef.get(DepositUseCase);
    withdraw = moduleRef.get(WithdrawUseCase);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deposit returns same transaction on duplicate idempotency key', async () => {
    const accountId = 'acc-001'; // seeded with 100.00
    const before = await prisma.account.findUnique({
      where: { id: accountId },
    });
    expect(before).not.toBeNull();
    const base = Number(before!.balanceCents);

    const input = { id: 'idem-dep-1', accountId, amount: 25 } as any;
    const r1: any = await deposit.execute(input);
    const r2: any = await deposit.execute(input);

    expect(r1.transactionId).toBeTypeOf('string');
    expect(r2.transactionId).toBe(r1.transactionId);

    const after = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(after!.balanceCents)).toBe(base + 2500);
  });

  it('withdraw returns same transaction on duplicate idempotency key', async () => {
    const accountId = 'acc-002'; // seeded with 500.00
    const before = await prisma.account.findUnique({
      where: { id: accountId },
    });
    expect(before).not.toBeNull();
    const base = Number(before!.balanceCents);

    const input = { id: 'idem-wd-1', accountId, amount: 40 } as any;
    const r1: any = await withdraw.execute(input);
    const r2: any = await withdraw.execute(input);

    expect(r1.transactionId).toBeTypeOf('string');
    expect(r2.transactionId).toBe(r1.transactionId);

    const after = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(after!.balanceCents)).toBe(base - 4000);
  });
});
