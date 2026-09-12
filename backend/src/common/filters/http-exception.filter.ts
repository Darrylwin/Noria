import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isKnown =
      exception instanceof HttpException ||
      this.isPayloadTooLargeError(exception);
    const status = this.resolveStatus(exception);
    const message = isKnown
      ? this.resolveKnownMessage(exception)
      : 'Une erreur est survenue, veuillez réessayer.';

    if (!isKnown) {
      // Erreur non anticipée : jamais de stack trace ni de détail Prisma/SQL exposé au
      // client. Le détail technique complet part uniquement dans les logs
      // serveur, pour permettre le diagnostic sans exposer d'information sensible.
      this.logger.error(
        `Erreur inattendue sur ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      // Le libellé "error" est dérivé du code HTTP via le dictionnaire standard de Node
      // (ex. 400 -> "Bad Request"), plutôt que reconstruit depuis le nom de la classe
      // d'exception : ça garantit un libellé toujours identique au format attendu par le
      // contrat d'API, quelle que soit l'exception levée.
      error: STATUS_CODES[status] ?? 'Erreur',
    });
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    // body-parser rejette un payload dépassant la limite configurée dans main.ts avec une
    // erreur typée 'entity.too.large', qui n'est pas une HttpException Nest.
    if (this.isPayloadTooLargeError(exception)) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveKnownMessage(exception: unknown): unknown {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      return typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
        ? (exceptionResponse as Record<string, unknown>).message
        : exception.message;
    }

    // Cas du payload trop volumineux : message générique, non technique.
    return 'Le contenu de la requête est trop volumineux.';
  }

  private isPayloadTooLargeError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      'type' in exception &&
      (exception as { type?: unknown }).type === 'entity.too.large'
    );
  }
}
