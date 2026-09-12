import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { json, urlencoded } from 'express';
import type { HelmetOptions } from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { JsonLogger } from './common/logger/json.logger.js';

const require = createRequire(import.meta.url);

/**
 * Contournement d'un bug non résolu du resolver TypeScript NodeNext avec les
 * paquets CommonJS "export =" (microsoft/TypeScript#50466, #53349 - toujours
 * ouverts, reproduit avec helmet 6.x et 7.x, indépendant de la version d'helmet).
 * La résolution de types NodeNext associe au module une déclaration "namespace"
 * sans signature d'appel, alors que le module CommonJS réel exporte bien une
 * fonction. On récupère donc l'implémentation réelle via createRequire (fiable
 * au runtime en ESM natif) et on la type explicitement nous-mêmes.
 */
type HelmetMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

const helmet: (
  options?: Readonly<HelmetOptions>,
) => HelmetMiddleware = require('helmet');

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    // En développement : logger NestJS standard (coloré, lisible dans le terminal).
    // En production : JsonLogger (une ligne JSON par événement, parseable par les outils
    // de collecte). Le switch se fait uniquement via NODE_ENV, sans configuration
    // supplémentaire.
    logger: isProduction ? new JsonLogger() : new Logger(),
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

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

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
