import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env/env';
import { EnvModule } from './env/env.module';
import { AccountModule } from '@/modules/account/account.module';
import { LedgerModule } from '@/modules/ledger/ledger.module';
import { TransactionModule } from '@/modules/transaction/transaction.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    EnvModule,
    AccountModule,
    LedgerModule,
    TransactionModule,
  ],
})
export class AppModule {}
