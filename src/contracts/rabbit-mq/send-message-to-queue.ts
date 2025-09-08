export interface ISendMessageToQueueRequest {
  queueName: string;

  object: any;
}

export abstract class SendMessageToQueueProvider {
  abstract execute(input: ISendMessageToQueueRequest): Promise<void>;
}
