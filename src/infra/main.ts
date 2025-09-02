// import 'newrelic';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './env/env.service';
import { patchNestJsSwagger } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  const configService = app.get(EnvService);

  app.setGlobalPrefix('/soterme/api');

  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders:
      'Content-Type,Accept, Authorization,Access-Control-Allow-Origin,x-access-token',
  });

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Soterme API')
    .setDescription('api em desenvolvimento')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document, {
    useGlobalPrefix: true,
  });

  const port = configService.get('PORT');

  await app.listen(port);
}
bootstrap();
