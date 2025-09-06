import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FeePolicyRepository } from '@/modules/transaction/repositories/fee-policy-repository';
import { FeePolicy } from '@/modules/transaction/entities/fee-policy';
import { TransactionType } from '@/modules/transaction/entities/enums';
import { UnitOfWorkTx } from '@/common/uow';
import { PrismaTxAdapter } from '../prisma-unit-of-work';
import { PrismaFeePolicyMapper } from '../mappers/fee-policy-mapper';

@Injectable()
export class PrismaFeePolicyRepository implements FeePolicyRepository {
  constructor(private prisma: PrismaService) {}

  async findActiveByType(
    input: { transactionType: TransactionType; at: Date },
    tx?: UnitOfWorkTx,
  ): Promise<FeePolicy | null> {
    const client = tx ? (tx as PrismaTxAdapter).client : this.prisma;
    const row = await client.feePolicy.findFirst({
      where: {
        transactionType: input.transactionType,
        startsAt: { lte: input.at },
        endsAt: { gte: input.at },
      },
      orderBy: { startsAt: 'desc' },
    });
    return row ? PrismaFeePolicyMapper.toDomain(row) : null;
  }
}
