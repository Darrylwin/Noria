import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap(): Promise<void> {
  // bodyParser désactivé au niveau de Nest pour pouvoir imposer nous-mêmes
  // une limite de taille sur le corps des requêtes JSON (voir plus bas).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const logger = new Logger('Bootstrap');

  // Filtre d'exception global : format d'erreur unique { statusCode, message, error }
  // sur toute l'API, jamais de stack trace ni de détail Prisma/SQL exposé.
  app.useGlobalFilters(new HttpExceptionFilter());

  // Journalisation des requêtes entrantes.
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  });

  // Limite de taille du payload, appliquée globalement.
  // Aucune route de l'API n'a besoin d'un corps de requête plus volumineux que
  // POST /diagnostics, une limite globale suffit donc et évite un middleware
  // dédié à une seule route.
  // Contrairement à une vérification du header Content-Length (falsifiable ou
  // absent en cas d'encodage chunked), cette limite est appliquée par body-parser
  // au fil de la lecture du flux : au-delà de 10 Ko réellement lus, il rejette
  // la requête avec un 413, quelle que soit la valeur du header.
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ extended: true, limit: '10kb' }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`Noria backend démarré sur le port ${port}`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- le logger Nest n'existe pas encore si bootstrap échoue avant sa création
  console.error('Échec du démarrage du backend Noria :', error);
  process.exit(1);
});
