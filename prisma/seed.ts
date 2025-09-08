import { PrismaClient, TransactionType } from '@prisma/client';
const ULID_ACC1 = '01J9MZ3ZYK2J4TN2YCE2V7ZVB8';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const accounts = [
    {
      number: '100001',
      fullName: 'Alice Example',
      cpf: '12345678901',
      balanceCents: 100_00n,
      creditLimitCents: 0n,
    },
    {
      number: '100002',
      fullName: 'Bob Example',
      cpf: '98765432100',
      balanceCents: 500_00n,
      creditLimitCents: 200_00n,
    },
    {
      number: '100003',
      fullName: 'Carol Example',
      cpf: '11122233344',
      balanceCents: 0n,
      creditLimitCents: 1_000_00n,
    },
  ];

  for (const a of accounts) {
    await prisma.account.upsert({
      // Use unique account number for idempotency
      where: { number: a.number },
      update: {
        balanceCents: a.balanceCents,
        creditLimitCents: a.creditLimitCents,
        fullName: a.fullName,
        cpf: a.cpf,
      },
      create: {
        id: ulid(),
        number: a.number,
        fullName: a.fullName,
        cpf: a.cpf,
        balanceCents: a.balanceCents,
        creditLimitCents: a.creditLimitCents,
        createdAt: now,
      },
    });
  }

  // Ensure known ULIDs used in tests exist with expected balances
  await prisma.account.upsert({
    where: { id: ULID_ACC1 },
    update: {
      number: ULID_ACC1.slice(-6),
      balanceCents: 100_00n,
      creditLimitCents: 0n,
      fullName: 'Seed ACC1',
      cpf: '00011122233',
      updatedAt: now,
    },
    create: {
      id: ULID_ACC1,
      number: ULID_ACC1.slice(-6),
      fullName: 'Seed ACC1',
      cpf: '00011122233',
      balanceCents: 100_00n,
      creditLimitCents: 0n,
      createdAt: now,
      updatedAt: now,
    },
  });

  const startsAt = new Date(now.getFullYear() - 10, 0, 1);
  const endsAt = new Date(now.getFullYear() + 10, 11, 31);

  // Withdraw: flat 2.00, no percent
  // Ensure a single default withdraw policy exists, with ULID id
  await prisma.feePolicy.deleteMany({
    where: { transactionType: TransactionType.WITHDRAW },
  });
  await prisma.feePolicy.create({
    data: {
      id: ulid(),
      transactionType: TransactionType.WITHDRAW,
      flatFeeCents: 200n,
      percentBps: 0,
      startsAt,
      endsAt,
    },
  });

  // Transfer: flat 1.00 + 0.5%
  // Ensure a single default transfer policy exists, with ULID id
  await prisma.feePolicy.deleteMany({
    where: { transactionType: TransactionType.TRANSFER },
  });
  await prisma.feePolicy.create({
    data: {
      id: ulid(),
      transactionType: TransactionType.TRANSFER,
      flatFeeCents: 100n,
      percentBps: 50,
      startsAt,
      endsAt,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
