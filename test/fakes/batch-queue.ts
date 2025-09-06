import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ISendMessageToQueueRequest,
  SendMessageToQueueProvider,
} from '@/contracts/rabbit-mq/send-message-to-queue';

@Injectable()
export class BatchQueue implements SendMessageToQueueProvider {
  public readonly published: ISendMessageToQueueRequest[] = [];
  private readonly buckets = new Map<string, any[]>();

  constructor(private readonly emitter: EventEmitter2) {}

  async execute(input: ISendMessageToQueueRequest): Promise<void> {
    this.published.push(input);
    const arr = this.buckets.get(input.queueName) ?? [];
    arr.push(input.object);
    this.buckets.set(input.queueName, arr);
  }

  // Emite todos acumulados para a fila como um único lote
  async flush(queueName: string): Promise<number> {
    const arr = this.buckets.get(queueName) ?? [];
    if (arr.length === 0) return 0;
    this.buckets.set(queueName, []);
    await this.emitter.emitAsync(queueName, arr);
    return arr.length;
  }

  // Emite em lotes de tamanho fixo (útil para simular prefetch)
  async flushInChunks(queueName: string, chunkSize: number): Promise<number> {
    const arr = this.buckets.get(queueName) ?? [];
    if (arr.length === 0) return 0;
    let count = 0;
    while (arr.length > 0) {
      const batch = arr.splice(0, chunkSize);
      count += batch.length;
      await this.emitter.emitAsync(queueName, batch);
    }
    this.buckets.set(queueName, []);
    return count;
  }
}
