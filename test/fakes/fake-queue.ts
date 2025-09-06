import {
  SendMessageToQueueProvider,
  ISendMessageToQueueRequest,
} from '@/contracts/rabbit-mq/send-message-to-queue';
import {
  ConsumeMessageFromQueueProvider,
  IStartQueueConsumerRequest,
} from '@/contracts/rabbit-mq/consume-message-from-queue';

export class FakeSendQueue implements SendMessageToQueueProvider {
  public published: ISendMessageToQueueRequest[] = [];
  async execute(input: ISendMessageToQueueRequest): Promise<void> {
    this.published.push(input);
  }
}

export class FakeConsumeQueue implements ConsumeMessageFromQueueProvider {
  public started: IStartQueueConsumerRequest[] = [];
  async execute(input: Array<IStartQueueConsumerRequest>): Promise<void> {
    this.started.push(...input);
  }
}
