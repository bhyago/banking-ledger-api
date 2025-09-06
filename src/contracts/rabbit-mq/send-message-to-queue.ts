export interface ISendMessageToQueueRequest {
  queueName: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: any;
}

export abstract class SendMessageToQueueProvider {
  abstract execute(input: ISendMessageToQueueRequest): Promise<void>;
}
