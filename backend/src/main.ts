import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Limite de taille du payload
  const express = app.getHttpAdapter().getInstance();
  express.use('/diagnostics', (req: any, res: any, next: any) => {
    req.headers['content-length'] &&
    parseInt(req.headers['content-length']) > 10 * 1024
      ? res.status(413).json({
          statusCode: 413,
          message: 'Payload trop volumineux.',
          error: 'Payload Too Large',
        })
      : next();
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Noria backend démarré sur le port ${port}`);
}

bootstrap();
