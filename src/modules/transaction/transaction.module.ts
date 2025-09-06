import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from '@/infra/database/database.module';
import { TransactionController } from './transaction.controller';
import { DepositUseCase } from './usecases/deposit';
import { AccountTransactionService } from './services/account-transaction.service';
import { TransferController } from './transfers.controller';
import { TransferUseCase } from './usecases/transfer';
import { WithdrawUseCase } from './usecases/withdraw';
import { QueueModule } from '@/infra/queue/queue.module';
import { TransactionQueueBootstrap } from './async/queue-bootstrap';
import { IdempotencyKeyMiddleware } from '@/infra/http/middlewares/idempotency-key.middleware';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [TransactionController, TransferController],
  providers: [
    AccountTransactionService,
    DepositUseCase,
    WithdrawUseCase,
    TransferUseCase,
    TransactionQueueBootstrap,
  ],
  exports: [],
})
export class TransactionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(IdempotencyKeyMiddleware)
      .forRoutes(TransactionController, TransferController);
  }
}
