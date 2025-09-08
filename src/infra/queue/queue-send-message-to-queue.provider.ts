import type {
  ISendMessageToQueueRequest,
  SendMessageToQueueProvider,
} from '@/contracts/rabbit-mq/send-message-to-queue';
import { EnvService } from '@/infra/env/env.service';
import { Injectable } from '@nestjs/common';
import { type Channel, connect } from 'amqplib';

@Injectable()
export class QueueSendMessageToQueueProvider
  implements SendMessageToQueueProvider
{
  constructor(private readonly envService: EnvService) {}

  async execute(input: ISendMessageToQueueRequest): Promise<void> {
    const connection = await connect(
      this.envService.get('QUEUE_SERVER_URL') || 'amqp://localhost:5672',
      {
        clientProperties: { connection_name: 'BankingAPI' },
      },
    );
    const channel = await connection.createChannel();
    await this.assertTopology(channel, input.queueName);
    await channel.publish(
      input.queueName,
      input.queueName,
      Buffer.from(JSON.stringify(input.object), 'utf-8'),
      { persistent: true },
    );
    await channel.close();
    await connection.close();
  }

  private async assertTopology(channel: Channel, name: string) {
    await channel.assertQueue(name, { durable: true });
    await channel.assertExchange(name, 'direct', { durable: true });
    await channel.bindQueue(name, name, name);
  }
}
