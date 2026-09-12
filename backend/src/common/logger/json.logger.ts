import type { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Logger JSON structuré pour les environnements de production.
 * Chaque événement est émis sur une seule ligne, parseable par les outils de collecte
 * (Datadog, Loki, CloudWatch) sans configuration de parsing supplémentaire.
 *
 * Format : { level, timestamp, context, message, stack? }
 */
export class JsonLogger implements LoggerService {
  /**
   * Normalise le champ "message" en string exploitable, y compris pour les instances
   * d'Error : leurs propriétés (message, stack, name) sont non énumérables, donc
   * JSON.stringify(error) produit "{}" silencieusement si on ne les extrait pas
   * explicitement. On préserve aussi error.cause (chaînage d'erreurs natif Node/ES2022),
   * fréquent dans les erreurs Prisma/NestJS qui enveloppent une cause racine.
   */
  private serializeMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      const cause =
        message.cause instanceof Error
          ? ` (cause: ${message.cause.name}: ${message.cause.message})`
          : '';
      return `${message.name}: ${message.message}${cause}`;
    }

    try {
      return JSON.stringify(message);
    } catch {
      // Cas des structures circulaires ou non sérialisables : on retombe sur String()
      // plutôt que de laisser JSON.stringify lever une exception dans le logger lui-même.
      return String(message);
    }
  }

  /**
   * Extrait la stack trace d'une Error si elle n'a pas été fournie explicitement en
   * paramètre - cas de logger.error(error) sans second argument stack.
   */
  private resolveStack(message: unknown, stack?: string): string | undefined {
    if (stack) {
      return stack;
    }
    return message instanceof Error ? message.stack : undefined;
  }

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
      message: this.serializeMessage(message),
    };

    const resolvedStack = this.resolveStack(message, stack);
    if (resolvedStack) {
      entry.stack = resolvedStack;
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
