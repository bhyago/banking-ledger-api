import { Injectable } from '@nestjs/common';
import type {
  ISendMessageToQueueRequest,
  SendMessageToQueueProvider,
} from '@/contracts/rabbit-mq/send-message-to-queue';
import type {
  ConsumeMessageFromQueueProvider,
  IStartQueueConsumerRequest,
} from '@/contracts/rabbit-mq/consume-message-from-queue';

@Injectable()
export class NoopSendMessageToQueueProvider
  implements SendMessageToQueueProvider
{
  async execute(_input: ISendMessageToQueueRequest): Promise<void> {
    // no-op in tests
  }
}

@Injectable()
export class NoopConsumeMessageFromQueueProvider
  implements ConsumeMessageFromQueueProvider
{
  async execute(_input: Array<IStartQueueConsumerRequest>): Promise<void> {
    // no-op in tests
  }
}
