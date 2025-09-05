import { Module } from '@nestjs/common';
import { CreateAccountUseCase } from './usecases/create-account';
import { DatabaseModule } from '@/infra/database/database.module';
import { GetAccountByIdUseCase } from './usecases/get-account-by-id';
import { AccountController } from './ account.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountController],
  providers: [CreateAccountUseCase, GetAccountByIdUseCase],
})
export class AccountModule {}
