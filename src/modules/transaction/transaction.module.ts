import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infra/database/database.module';
import { TransactionController } from './transaction.controller';
import { DepositUseCase } from './usecases/deposit';
import { AccountTransactionService } from './services/account-transaction.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionController],
  providers: [DepositUseCase, AccountTransactionService],
  exports: [],
})
export class TransactionModule {}
