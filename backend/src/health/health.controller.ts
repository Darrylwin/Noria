import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

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

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /health
   * Effectue une requête réelle sur la BDD et contrôle l'état du processus Node.js.
   */
  @Get()
  @ApiOperation({
    summary: 'Vérifie la disponibilité du service et de la base de données',
    description:
      'Effectue un ping SQL réel (SELECT 1) sur PostgreSQL à chaque appel, pas un simple ' +
      '"le processus tourne". Destiné à un usage d\'infrastructure (load balancer, plateforme ' +
      "d'hébergement), pas à un affichage côté utilisateur final.",
  })
  @ApiResponse({
    status: 200,
    description: 'Service et base de données opérationnels.',
  })
  @ApiResponse({
    status: 503,
    description:
      'Le processus tourne mais la base de données est inaccessible.',
  })
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
