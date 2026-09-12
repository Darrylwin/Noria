import type { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Logger JSON structuré pour les environnements de production.
 * Chaque événement est émis sur une seule ligne, parseable par les outils de collecte
 * (Datadog, Loki, CloudWatch) sans configuration de parsing supplémentaire.
 *
 * Format : { level, timestamp, context, message, stack? }
 */
export class JsonLogger implements LoggerService {
  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const entry: Record<string, unknown> = {
      level,
      timestamp: new Date().toISOString(),
      context: context ?? 'Application',
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    if (stack) {
      entry.stack = stack;
    }

    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.write('error', message, context, stack);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', message, context);
  }
}
