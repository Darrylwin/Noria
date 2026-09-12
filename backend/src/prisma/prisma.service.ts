import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service global d'abstraction Prisma Client.
 * Gère l'établissement et la fermeture propre des connexions à la base de données.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Initialise la connexion à la base de données PostgreSQL au démarrage du module.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Ferme les connexions ouvertes du pool Prisma lors de l'arrêt de l'application.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
