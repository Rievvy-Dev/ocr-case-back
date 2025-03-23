import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: "http://localhost:3000", 
    credentials: true, 
  });

  app.use(cookieParser());

  app.useStaticAssets(join(__dirname, '..', 'uploads'));

  const config = new DocumentBuilder()
    .setTitle('API Paggo OCR')
    .setDescription('Documentação da API Paggo OCR')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3001);
}
bootstrap();
