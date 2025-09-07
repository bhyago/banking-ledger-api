import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AccountRepository } from '@/modules/account/repositories/account-repository';
import type { Account } from '@/modules/account/entities/account';
import { PrismaAccountMapper } from '../mappers/account-mapper';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private prisma: PrismaService) {}
  async findById(input: { accountId: string }): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId },
    });
    if (!account) return null;
    return PrismaAccountMapper.toDomain(account);
  }

  async save(input: Account): Promise<{ id: string }> {
    const account = await this.prisma.account.create({
      data: PrismaAccountMapper.toPrisma(input),
    });

    return {
      id: account.id,
    };
  }

  async update(input: Account): Promise<void> {
    await this.prisma.account.update({
      where: { id: input.id.toValue() },
      data: PrismaAccountMapper.toPrisma(input),
    });
  }
}
