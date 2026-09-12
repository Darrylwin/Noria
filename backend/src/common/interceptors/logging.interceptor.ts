import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        // Requête terminée avec succès : à ce stade, Nest a déjà posé le vrai code de
        // statut sur la réponse (200, 201...).
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${duration}ms`,
          );
        },
        // Requête terminée en erreur (validation, 404, 413, 429, 500...) : on trace quand
        // même la ligne d'accès avec le vrai statut. L'erreur n'est pas interceptée ici,
        // seulement observée - elle continue normalement vers HttpExceptionFilter, qui
        // reste seul responsable du détail technique complet pour les erreurs inattendues
        // pour ne pas dupliquer le stack trace à deux endroits.
        error: (error: unknown) => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} ${url} ${this.resolveErrorStatus(error)} - ${duration}ms`,
          );
        },
      }),
    );
  }

  private resolveErrorStatus(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    // body-parser rejette un payload trop volumineux avec une erreur typée
    // 'entity.too.large', qui n'est pas une HttpException Nest - même détection que dans
    // HttpExceptionFilter, pour que la ligne de log reflète le vrai code renvoyé (413).
    if (
      error instanceof Error &&
      'type' in error &&
      (error as { type?: unknown }).type === 'entity.too.large'
    ) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
