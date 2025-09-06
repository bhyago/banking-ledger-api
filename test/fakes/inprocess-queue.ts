import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ISendMessageToQueueRequest,
  SendMessageToQueueProvider,
} from '@/contracts/rabbit-mq/send-message-to-queue';

@Injectable()
export class InProcessEmitQueue implements SendMessageToQueueProvider {
  public published: ISendMessageToQueueRequest[] = [];
  constructor(private readonly emitter: EventEmitter2) {}
  async execute(input: ISendMessageToQueueRequest): Promise<void> {
    this.published.push(input);
    // Emite como lote de 1, simulando flush do consumidor
    await this.emitter.emitAsync(input.queueName, [input.object]);
  }
}
