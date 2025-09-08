import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infra/database/database.module';
import { TransactionController } from './transaction.controller';
import { DepositUseCase } from './usecases/deposit';
import { AccountTransactionService } from './services/account-transaction.service';
import { TransferController } from './transfers.controller';
import { TransferUseCase } from './usecases/transfer';
import { WithdrawUseCase } from './usecases/withdraw';
import { QueueModule } from '@/infra/queue/queue.module';
import { TransactionQueueBootstrap } from './async/queue-bootstrap';
import { AccountLockService } from '@/common/concurrency/account-lock.service';
import { GetAccountTransactionsUseCase } from './usecases/get-account-transactions';
import { ProcessBatchAccountTransactionsUseCase } from './usecases/process-batch-account-transactions';
import { ProcessBatchTransfersUseCase } from './usecases/process-batch-transfers';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [TransactionController, TransferController],
  providers: [
    AccountTransactionService,
    DepositUseCase,
    WithdrawUseCase,
    TransferUseCase,
    TransactionQueueBootstrap,
    AccountLockService,
    GetAccountTransactionsUseCase,
    ProcessBatchAccountTransactionsUseCase,
    ProcessBatchTransfersUseCase,
  ],
  exports: [],
})
export class TransactionModule {}
