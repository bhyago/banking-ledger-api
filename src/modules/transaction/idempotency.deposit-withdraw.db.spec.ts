import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { FakeConsumeQueue, FakeSendQueue } from 'test/fakes/fake-queue';
import { AccountTransactionService } from '@/modules/transaction/services/account-transaction.service';
import { randomUUID } from 'crypto';

describe('Idempotency (Deposit & Withdraw) - DB', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let txService: AccountTransactionService;

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
    txService = moduleRef.get(AccountTransactionService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deposit returns same transaction on duplicate idempotency key', async () => {
    const accountId = 'acc-001';
    const now = new Date();
    // Ensure account exists with 100.00 balance
    await prisma.account.upsert({
      where: { id: accountId },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accountId,
        number: 'E2E001',
        balanceCents: 100_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    const before = await prisma.account.findUnique({
      where: { id: accountId },
    });
    expect(before).not.toBeNull();
    const base = Number(before!.balanceCents);

    const depKey = randomUUID();
    const r1: any = await txService.deposit({
      accountId,
      amount: 25,
      idempotencyKey: depKey,
    });
    await txService
      .deposit({
        accountId,
        amount: 25,
        idempotencyKey: depKey,
      })
      .catch(() => {});

    expect(r1.transactionId).toBeTypeOf('string');
    const depCount = await prisma.transaction.count({
      where: {
        accountId,
        type: 'DEPOSIT',
        idempotencyKey: depKey,
      },
    });
    expect(depCount).toBe(1);

    const after = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(after!.balanceCents)).toBe(base + 2500);
  });

  it('withdraw returns same transaction on duplicate idempotency key', async () => {
    const accountId = 'acc-002';
    const now = new Date();
    // Ensure account exists with 500.00 balance
    await prisma.account.upsert({
      where: { id: accountId },
      update: { balanceCents: 500_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: accountId,
        number: 'E2E002',
        balanceCents: 500_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    const before = await prisma.account.findUnique({
      where: { id: accountId },
    });
    expect(before).not.toBeNull();
    const base = Number(before!.balanceCents);

    const wdKey = randomUUID();
    const r1: any = await txService.withdraw({
      accountId,
      amount: 40,
      idempotencyKey: wdKey,
    } as any);
    await txService
      .withdraw({
        accountId,
        amount: 40,
        idempotencyKey: wdKey,
      } as any)
      .catch(() => {});

    expect(r1.transactionId).toBeTypeOf('string');
    const wdTx = await prisma.transaction.findFirst({
      where: {
        accountId,
        type: 'WITHDRAW',
        idempotencyKey: wdKey,
      },
    });
    expect(wdTx).toBeTruthy();

    const after = await prisma.account.findUnique({ where: { id: accountId } });
    const expectedAfter =
      base - (Number(wdTx!.amountCents) + Number(wdTx!.feeCents));
    expect(Number(after!.balanceCents)).toBe(expectedAfter);
  });
});
