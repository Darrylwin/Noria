import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import type { HelmetOptions } from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { JsonLogger } from './common/logger/json.logger.js';

const require = createRequire(import.meta.url);

/**
 * Contournement d'un bug non résolu du resolver TypeScript NodeNext avec les
 * paquets CommonJS "export =" (microsoft/TypeScript#50466, #53349). La résolution
 * de types NodeNext associe au module une déclaration "namespace" sans signature
 * d'appel, alors que le module CommonJS réel exporte bien une fonction. On récupère
 * donc l'implémentation réelle via createRequire (fiable au runtime en ESM natif)
 * et on la type explicitement nous-mêmes.
 */
type HelmetMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

const helmet: (
  options?: Readonly<HelmetOptions>,
) => HelmetMiddleware = require('helmet');

// CSP appliquée à toute l'API métier : la plus stricte possible.
const strictCsp: HelmetOptions['contentSecurityPolicy'] = {
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
};

/**
 * CSP dédiée à /docs* : Swagger UI embarque un script inline (JSON.stringify du contrat
 * OpenAPI) directement dans sa page HTML générée par SwaggerModule, impossible à
 * supprimer sans réécrire le template. Cette politique plus permissive n'est donc
 * jamais appliquée au reste de l'API, pour ne pas affaiblir la protection XSS des
 * routes métier.
 */
const docsCsp: HelmetOptions['contentSecurityPolicy'] = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
};

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

  // Sélection de la CSP selon le chemin demandé : stricte partout, sauf sur /docs*
  // où Swagger UI a besoin d'exécuter un script inline (voir justification ci-dessus).
  const strictHelmet = helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: strictCsp,
  });
  const docsHelmet = helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: docsCsp,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    (req.path.startsWith('/docs') ? docsHelmet : strictHelmet)(req, res, next);
  });

  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ extended: true, limit: '10kb' }));

  // --- Documentation API (Swagger UI) ---
  // Générée uniquement à partir des décorateurs @Api* posés sur les controllers/DTOs :
  // elle ne peut donc jamais diverger silencieusement du code réel.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Noria')
    .setDescription(
      'Évaluez la structuration de votre entreprise et identifiez les leviers prioritaires pour son développement.',
    )
    .setVersion('1.0')
    .addTag(
      'diagnostics',
      'Soumission et consultation des résultats de diagnostic',
    )
    .addTag('questions', 'Catalogue des questions du questionnaire')
    .addTag('health', 'Vérification de disponibilité du service')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Route volontairement en dehors de /api et du versionnement : une doc n'est pas une
  // ressource métier versionnée. SwaggerModule gère lui-même le routage, le service des
  // assets statiques (swagger-ui-dist) et le rendu HTML.
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`Noria backend démarré sur le port ${port} (API v1)`);
  logger.log(`Documentation API disponible sur http://localhost:${port}/docs`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- Le logger Nest n'est pas instancié si l'initialisation échoue
  console.error('Échec du démarrage du backend Noria :', error);
  process.exit(1);
});
