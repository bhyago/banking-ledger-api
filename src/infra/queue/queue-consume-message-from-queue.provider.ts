import type {
  ConsumeMessageFromQueueProvider,
  IStartQueueConsumerRequest,
} from '@/contracts/rabbit-mq/consume-message-from-queue';
import { EnvService } from '@/infra/env/env.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Channel, type ConsumeMessage, connect } from 'amqplib';

@Injectable()
export class QueueConsumeMessageFromQueueProvider
  implements ConsumeMessageFromQueueProvider
{
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly envService: EnvService,
  ) {}

  async execute(input: Array<IStartQueueConsumerRequest>) {
    for await (const queue of input) {
      try {
        const connection = await connect(
          this.envService.get('QUEUE_SERVER_URL') ||
            'amqp://rabbitmq:rabbitmq@localhost:5672',
          {
            clientProperties: { connection_name: 'BankingAPI' },
          },
        );
        connection.on('error', (error) => {
          console.error(`Erro na conexão de ${queue.queueName}:`, error);
        });
        const channel = await connection.createChannel();
        await this.assertTopology(channel, queue.queueName);

        const batchSize = this.getBatchSize();
        const batchWindow = this.getBatchWindowMs();
        await channel.prefetch(batchSize);

        const buffer: ConsumeMessage[] = [];
        let timer: NodeJS.Timeout | undefined;
        const flush = async () => {
          if (timer) {
            clearTimeout(timer);
            timer = undefined;
          }
          if (buffer.length === 0) return;
          const batch = buffer.splice(0, buffer.length);
          const payloads = batch.map((m) => JSON.parse(m.content.toString()));
          try {
            await this.eventEmitter.emitAsync(queue.eventName, payloads);
            batch.forEach((m) => channel.ack(m));
          } catch (error) {
            console.error(
              `Não foi possível processar o lote da fila ${queue.queueName}:`,
              error,
            );
            const requeue =
              this.envService.get('RABBITMQ_REQUEUE_ON_FAIL') ?? false;
            batch.forEach((m) => channel.nack(m, false, requeue));
          }
        };

        await channel.consume(queue.queueName, async (msg) => {
          if (!msg) return;
          buffer.push(msg);
          if (buffer.length >= batchSize) {
            await flush();
          } else if (!timer) {
            timer = setTimeout(flush, batchWindow);
          }
        });

        const restart = async () => {
          try {
            await channel.close();
          } catch {}
          await this.execute([
            { queueName: queue.queueName, eventName: queue.eventName },
          ]);
        };
        channel.on('error', restart);
        channel.on('close', restart);
      } catch (error) {
        console.error(
          `Erro ao criar consumidor para ${queue.queueName}:`,
          error,
        );
      }
    }
  }

  private async assertTopology(channel: Channel, name: string) {
    await channel.assertQueue(name, { durable: true });
    await channel.assertExchange(name, 'direct', { durable: true });
    await channel.bindQueue(name, name, name);
  }

  private getBatchSize(): number {
    const n = this.envService.get('TX_BATCH_SIZE');
    return Number.isFinite(n) && n > 0 ? n : 100;
  }

  private getBatchWindowMs(): number {
    const n = this.envService.get('TX_BATCH_WINDOW_MS');
    return Number.isFinite(n) && n >= 0 ? n : 200;
  }
}
