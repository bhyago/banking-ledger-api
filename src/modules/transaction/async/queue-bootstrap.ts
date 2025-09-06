import { Injectable, OnModuleInit } from '@nestjs/common';
import { QUEUES } from './messages';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';

@Injectable()
export class TransactionQueueBootstrap implements OnModuleInit {
  constructor(private readonly consumer: ConsumeMessageFromQueueProvider) {}

  async onModuleInit() {
    await this.consumer.execute([
      { queueName: QUEUES.deposit, eventName: QUEUES.deposit },
      { queueName: QUEUES.withdraw, eventName: QUEUES.withdraw },
      { queueName: QUEUES.transfer, eventName: QUEUES.transfer },
    ]);
  }
}
