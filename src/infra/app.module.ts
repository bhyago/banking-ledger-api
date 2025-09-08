import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env/env';
import { EnvModule } from './env/env.module';
import { AccountModule } from '@/modules/account/account.module';
import { LedgerModule } from '@/modules/ledger/ledger.module';
import { TransactionModule } from '@/modules/transaction/transaction.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppLoggingInterceptor } from './logging/app-logging.interceptor';
import { StructuredLoggerService } from './logging/structured-logger.service';

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
  providers: [
    StructuredLoggerService,
    { provide: APP_INTERCEPTOR, useClass: AppLoggingInterceptor },
  ],
})
export class AppModule {}
