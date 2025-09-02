import { Module } from '@nestjs/common';
import { CreateAccountUseCase } from './usecases/create-account';
import { AccountController } from './ account.controller';
import { DatabaseModule } from '@/infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountController],
  providers: [CreateAccountUseCase],
})
export class AccountModule {}
