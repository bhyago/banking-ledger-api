import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infra/database/database.module';
import { TransactionController } from './transaction.controller';
import { DepositUseCase } from './usecases/deposit';
import { AccountTransactionService } from './services/account-transaction.service';
import { TransferController } from './transfers.controller';
import { TransferUseCase } from './usecases/transfer';
import { WithdrawUseCase } from './usecases/withdraw';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionController, TransferController],
  providers: [
    AccountTransactionService,
    DepositUseCase,
    WithdrawUseCase,
    TransferUseCase,
  ],
  exports: [],
})
export class TransactionModule {}
