import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TransferRepository } from '@/modules/transaction/repositories/transfer-repository';
import { Transfer } from '@/modules/transaction/entities/transfer';
import { UnitOfWorkTx } from '@/common/uow';
import { PrismaTxAdapter } from '../prisma-unit-of-work';
import { PrismaTransferMapper } from '../mappers/transfer-mapper';

@Injectable()
export class PrismaTransferRepository implements TransferRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: Transfer, tx?: UnitOfWorkTx): Promise<{ id: string }> {
    const client = tx ? (tx as PrismaTxAdapter).client : this.prisma;
    const row = await client.transfer.create({
      data: PrismaTransferMapper.toPrisma(input),
    });
    return { id: row.id };
  }
}
