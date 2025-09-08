import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infra/database/database.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { LedgerController } from './ledger.controller';
import { GetAccountLedgerUseCase } from './usecases/get-account-ledger';

@Module({
  imports: [DatabaseModule],
  controllers: [LedgerController],
  providers: [GetAccountLedgerUseCase, PrismaService],
})
export class LedgerModule {}
