import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { UnitOfWork, UnitOfWorkTx } from '@/common/uow';

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
