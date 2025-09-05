import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TransactionRepository } from '@/modules/transaction/repositories/transaction-repository';
import { Transaction } from '@/modules/transaction/entities/transaction';
import { PrismaTransactionMapper } from '../mappers/transaction-mapper';
import { UnitOfWorkTx } from '@/common/uow';
import { PrismaTxAdapter } from '../prisma-unit-of-work';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: Transaction, tx?: UnitOfWorkTx): Promise<{ id: string }> {
    const client = tx ? (tx as PrismaTxAdapter).client : this.prisma;
    const row = await client.transaction.create({
      data: PrismaTransactionMapper.toPrisma(input),
    });
    return { id: row.id };
  }
}
