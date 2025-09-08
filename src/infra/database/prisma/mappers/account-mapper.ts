import type { Prisma, Account as AccountPrisma } from '@prisma/client';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { Account } from '@/modules/account/entities/account';

export class PrismaAccountMapper {
  static toDomain(prisma: AccountPrisma): Account {
    const id = new UniqueEntityID(prisma.id);
    const props = {
      number: prisma.number,
      balance: Number(prisma.balanceCents) / 100,
      creditLimit: Number(prisma.creditLimitCents) / 100,
      fullName: prisma.fullName ?? null,
      cpf: prisma.cpf ?? null,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      deletedAt: prisma.deletedAt ?? null,
    } as const;
    return Account.restore(props, id);
  }

  static toPrisma(domain: Account): Prisma.AccountCreateInput {
    return {
      number: domain.number,
      balanceCents: BigInt(Math.round(domain.balance * 100)),
      creditLimitCents: BigInt(Math.round(domain.creditLimit * 100)),
      fullName: domain.fullName ?? null,
      cpf: domain.cpf ?? null,
      deletedAt: domain.deletedAt,
      updatedAt: domain.updatedAt,
      createdAt: domain.createdAt,
    };
  }
}
