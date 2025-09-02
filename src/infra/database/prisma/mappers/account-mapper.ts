import { Prisma, Account as AccountPrisma } from '@prisma/client';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { Account } from '@/modules/account/entities/account';

export class PrismaAccountMapper {
  static toDomain(prisma: AccountPrisma): Account {
    return Account.create({
      deletedAt: prisma.deletedAt,
    });
  }

  static toPrisma(domain: Account): Prisma.AccountCreateInput {
    return {
      number: domain.number,
      balanceCents: domain.balance * 100,
      creditLimitCents: domain.creditLimit * 100,
      deletedAt: domain.deletedAt,
      updatedAt: domain.updatedAt,
      createdAt: domain.createdAt,
    };
  }
}
