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
import { FeePolicyRepository } from '@/modules/transaction/repositories/fee-policy-repository';
import { PrismaFeePolicyRepository } from './prisma/repositories/prisma-fee-policy-repository';
import { TransferRepository } from '@/modules/transaction/repositories/transfer-repository';
import { PrismaTransferRepository } from './prisma/repositories/prisma-transfer-repository';

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
    {
      provide: TransferRepository,
      useClass: PrismaTransferRepository,
    },
    {
      provide: FeePolicyRepository,
      useClass: PrismaFeePolicyRepository,
    },
  ],
  exports: [
    PrismaService,
    AccountRepository,
    LedgerRepository,
    TransactionRepository,
    TransferRepository,
    FeePolicyRepository,
    UNIT_OF_WORK,
  ],
})
export class DatabaseModule {}
