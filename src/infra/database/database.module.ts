import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AccountRepository } from '@/modules/account/repositories/account-repository';
import { PrismaAccountRepository } from './prisma/repositories/prisma-account-repository';
import { LedgerRepository } from '@/modules/transaction/repositories/ledger-repository';
import { PrismaLedgerRepository } from './prisma/repositories/prisma-ledger-repository';
import { UNIT_OF_WORK } from '@/common/uow';
import { PrismaUnitOfWork } from './prisma/prisma-unit-of-work';
import { TransactionRepository } from '@/modules/transaction/repositories/transaction-repository';
import { PrismaTransactionRepository } from './prisma/repositories/prisma-transaction-repository';

@Module({
  imports: [],
  providers: [
    PrismaService,
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    {
      provide: AccountRepository,
      useClass: PrismaAccountRepository,
    },
    {
      provide: LedgerRepository,
      useClass: PrismaLedgerRepository,
    },
    {
      provide: TransactionRepository,
      useClass: PrismaTransactionRepository,
    },
  ],
  exports: [
    AccountRepository,
    LedgerRepository,
    TransactionRepository,
    UNIT_OF_WORK,
  ],
})
export class DatabaseModule {}
