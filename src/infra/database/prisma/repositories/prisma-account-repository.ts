import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { Account } from '@/modules/account/entities/account';
import { PrismaAccountMapper } from '../mappers/account-mapper';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private prisma: PrismaService) {}
  findById(input: { accountId: string }): Promise<Account | null> {
    throw new Error('Method not implemented.');
  }
  findAccountLedger(input: { accountId: string }): Promise<Account | null> {
    throw new Error('Method not implemented.');
  }
  async save(input: Account): Promise<{ id: string }> {
    const account = await this.prisma.account.create({
      data: PrismaAccountMapper.toPrisma(input),
    });

    return {
      id: account.id,
    };
  }
}
