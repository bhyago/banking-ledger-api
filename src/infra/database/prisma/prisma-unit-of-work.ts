import { Injectable } from '@nestjs/common';
import type { PrismaService } from './prisma.service';
import type { Prisma } from '@prisma/client';
import type { UnitOfWork, UnitOfWorkTx } from '@/common/uow';

@Injectable()
export class PrismaTxAdapter implements UnitOfWorkTx {
  constructor(public readonly client: Prisma.TransactionClient) {}
}

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: UnitOfWorkTx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => fn(new PrismaTxAdapter(tx)));
  }
}
