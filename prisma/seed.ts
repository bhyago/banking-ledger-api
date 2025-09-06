import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Basic seed: a few accounts with initial balances/limits
  const now = new Date();
  const accounts = [
    {
      id: 'acc-001',
      number: '100001',
      balanceCents: 100_00n,
      creditLimitCents: 0n,
    },
    {
      id: 'acc-002',
      number: '100002',
      balanceCents: 500_00n,
      creditLimitCents: 200_00n,
    },
    {
      id: 'acc-003',
      number: '100003',
      balanceCents: 0n,
      creditLimitCents: 1_000_00n,
    },
  ];

  for (const a of accounts) {
    await prisma.account.upsert({
      where: { id: a.id },
      update: {
        balanceCents: a.balanceCents,
        creditLimitCents: a.creditLimitCents,
        updatedAt: now,
      },
      create: {
        id: a.id,
        number: a.number,
        balanceCents: a.balanceCents,
        creditLimitCents: a.creditLimitCents,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
