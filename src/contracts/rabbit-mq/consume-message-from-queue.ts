export interface IStartQueueConsumerRequest {
  queueName: string;
  eventName: string;
}

export abstract class ConsumeMessageFromQueueProvider {
  abstract execute(input: Array<IStartQueueConsumerRequest>): Promise<void>;
}
