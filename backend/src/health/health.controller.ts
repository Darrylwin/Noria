import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Interface décrivant la structure de réponse du bilanciel de santé.
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number; // en secondes
  services: {
    database: 'up' | 'down';
  };
  system: {
    memoryHeapUsed: string;
    memoryHeapTotal: string;
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /health
   * Effectue une requête réelle sur la BDD et contrôle l'état du processus Node.js.
   */
  @Get()
  async check(): Promise<HealthCheckResponse> {
    const memory = process.memoryUsage();
    const uptime = Math.floor(process.uptime());

    try {
      // 1. Test de connectivité réelle vers PostgreSQL via Prisma (ping SQL)
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime,
        services: {
          database: 'up',
        },
        system: {
          memoryHeapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
          memoryHeapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        },
      };
    } catch (error) {
      // 2. Si la BDD est inaccessible, lever une 503 pour alerter les reverse proxies / load balancers
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime,
        services: {
          database: 'down',
        },
        system: {
          memoryHeapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
          memoryHeapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        },
        error: error instanceof Error ? error.message : 'Database ping failed',
      });
    }
  }
}
