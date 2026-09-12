import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { DiagnosticModule } from './diagnostic/diagnostic.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { HealthModule } from './health/health.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { validate } from './config/env.validation.js';

/**
 * Module racine (AppModule) orchestrant les modules applicatifs,
 * la configuration, la persistance Prisma et les guards/interceptors globaux.
 */
@Module({
  imports: [
    // 1. Configuration globale des variables d'environnement
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    // 2. Protection contre les attaques par force brute / Rate Limiting (10 req/min)
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    // 3. Modules de l'infrastructure et du domaine
    PrismaModule,
    HealthModule,
    DiagnosticModule,
    QuestionsModule,
  ],
  providers: [
    // Filtre d'exception global (formatage unifié des erreurs HTTP)
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Intercepteur de journalisation (logs d'exécution et requêtes HTTP)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Guard de Rate Limiting appliqué à l'ensemble des routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
