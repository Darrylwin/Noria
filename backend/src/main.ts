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
      `Évaluez la structuration de votre entreprise et identifiez les leviers prioritaires pour son développement.

## Vue d'ensemble du parcours

1. Le frontend appelle GET /questions pour obtenir les 10 questions à afficher (textes, options, ordre).
2. L'utilisateur répond aux 10 questions. Le frontend n'envoie jamais rien au serveur avant la fin.
3. Le frontend appelle POST /diagnostics avec les 10 codes de réponse choisis.
4. Le serveur calcule le score et renvoie le résultat complet en une seule réponse (voir DiagnosticResponseDto) - aucun second appel n'est nécessaire pour afficher l'écran de résultat.
5. GET /diagnostics/:id permet de recharger ce même résultat plus tard (ex. rafraîchissement de page), avec exactement la même structure de réponse.

## Règle métier essentielle à connaître

Le score de Formalisation détermine un plafond appliqué aux scores de Comptabilité et de Financement (formule : 50 + 0.5 × score de Formalisation). Si l'entreprise est mal formalisée, ses scores de Comptabilité et de Financement peuvent être plafonnés même s'ils sont naturellement élevés. Quand ce plafonnement change effectivement le résultat, cascadeTriggered vaut true dans la réponse, et le texte de recommandation change en conséquence pour prioriser la Formalisation. Le frontend n'a jamais à recalculer ou à vérifier cette logique : il affiche simplement ce que l'API renvoie. Voir les descriptions des champs scores.*.raw / scores.*.final et cascadeTriggered dans DiagnosticResponseDto pour le détail.

## Format d'erreur

Toute réponse en échec, quel que soit l'endpoint, suit le même format (voir HttpErrorDto) :
{ "statusCode": number, "message": string | string[], "error": string }
Aucune stack trace ni détail technique (SQL, Prisma) n'est jamais renvoyé au client.

## Limites à connaître

- POST /diagnostics : 10 requêtes par minute par adresse IP (429 au-delà), payload max 10 Ko (413 au-delà).
- Aucune authentification sur aucun endpoint : le diagnostic est entièrement public et anonyme.
- CORS : une seule origine autorisée (configurée côté serveur), toute autre origine est bloquée par le navigateur.
- Toutes les routes métier sont préfixées /api/v1 (ex. /api/v1/diagnostics) - cette documentation n'affiche que le chemin relatif à ce préfixe.`,
    )
    .setVersion('1.0')
    .addTag(
      'diagnostics',
      'Soumission des réponses et consultation des résultats de diagnostic - le cœur du parcours utilisateur',
    )
    .addTag(
      'questions',
      'Catalogue des 10 questions à afficher, source de vérité unique des textes et options',
    )
    .addTag(
      'health',
      "Vérification de disponibilité du service, à usage d'infrastructure uniquement",
    )
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
