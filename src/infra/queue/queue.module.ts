import { Module } from '@nestjs/common';
import { QueueConsumeMessageFromQueueProvider } from './queue-consume-message-from-queue.provider';
import { QueueSendMessageToQueueProvider } from './queue-send-message-to-queue.provider';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { EnvModule } from '@/infra/env/env.module';
import {
  NoopConsumeMessageFromQueueProvider,
  NoopSendMessageToQueueProvider,
} from './test-queue.providers';

@Module({
  imports: [EnvModule],
  providers: [
    process.env.NODE_ENV === 'test' || process.env.QUEUE_FAKE === 'true'
      ? {
          provide: ConsumeMessageFromQueueProvider,
          useValue: { execute: async () => {} },
        }
      : {
          provide: ConsumeMessageFromQueueProvider,
          useClass: QueueConsumeMessageFromQueueProvider,
        },
    process.env.NODE_ENV === 'test' || process.env.QUEUE_FAKE === 'true'
      ? {
          provide: SendMessageToQueueProvider,
          useValue: { execute: async () => {} },
        }
      : {
          provide: SendMessageToQueueProvider,
          useClass: QueueSendMessageToQueueProvider,
        },
  ],
  exports: [ConsumeMessageFromQueueProvider, SendMessageToQueueProvider],
})
export class QueueModule {}
