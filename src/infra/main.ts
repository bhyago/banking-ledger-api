import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './env/env.service';
import { patchNestJsSwagger } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  const configService = app.get(EnvService);

  app.setGlobalPrefix('banking-ledger');

  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders:
      'Content-Type,Accept, Authorization,Access-Control-Allow-Origin,x-access-token',
  });

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle('Banking Ledger API')
    .setDescription(
      [
        'API para gerenciamento de contas, transações e transferências com consistência financeira.',
        '- Processamento assíncrono via filas (idempotência suportada).',
        '- Padrões de erro: corpo { name, message } para erros conhecidos.',
        '- Todas as rotas usam validação com Zod e estão documentadas com exemplos.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('account', 'Gerenciamento de contas')
    .addTag('ledger', 'Consulta de lançamentos (razão)')
    .addTag('transactions', 'Depósitos, saques e listagem')
    .addTag('transfer', 'Transferências entre contas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document, {
    useGlobalPrefix: true,
  });

  const port = configService.get('PORT');
  await app.listen(port);
}
bootstrap();
