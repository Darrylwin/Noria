import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap(): Promise<void> {
  // BodyParser désactivé au niveau de Nest pour appliquer une limite
  // de taille stricte sur le corps des requêtes JSON via Express body-parser.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const logger = new Logger('Bootstrap');

  // 1. Définition du préfixe global /api
  app.setGlobalPrefix('api');

  // 2. Activation du versionnement de l'API par URI
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Filtre d'exception global : format d'erreur unique { statusCode, message, error }
  // sur toute l'API, sans jamais exposer de stack trace ou de détail Prisma/SQL.
  app.useGlobalFilters(new HttpExceptionFilter());

  // Journalisation des requêtes entrantes.
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Validation stricte des DTOs (rejet des propriétés non déclarées)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuration CORS
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  });

  // Limite globale de la taille du payload (10 Ko max)
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ extended: true, limit: '10kb' }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`Noria backend démarré sur le port ${port} (API v1)`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- Le logger Nest n'est pas instancié si l'initialisation échoue
  console.error('Échec du démarrage du backend Noria :', error);
  process.exit(1);
});
