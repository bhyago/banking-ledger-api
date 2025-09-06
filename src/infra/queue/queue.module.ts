import { Module } from '@nestjs/common';
import { QueueConsumeMessageFromQueueProvider } from './queue-consume-message-from-queue.provider';
import { QueueSendMessageToQueueProvider } from './queue-send-message-to-queue.provider';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { EnvModule } from '@/infra/env/env.module';

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: ConsumeMessageFromQueueProvider,
      useClass: QueueConsumeMessageFromQueueProvider,
    },
    {
      provide: SendMessageToQueueProvider,
      useClass: QueueSendMessageToQueueProvider,
    },
  ],
  exports: [ConsumeMessageFromQueueProvider, SendMessageToQueueProvider],
})
export class QueueModule {}
