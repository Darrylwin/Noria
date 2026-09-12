import { ApiProperty } from '@nestjs/swagger';

/**
 * Format d'erreur unique produit par HttpExceptionFilter pour toute réponse en échec
 * de l'API, quelle que soit son origine (validation, ressource introuvable, erreur
 * serveur, rate limit dépassé). Le frontend peut se fier à cette structure pour tout
 * code d'erreur sans avoir à gérer de cas particulier par endpoint.
 */
export class HttpErrorDto {
  @ApiProperty({
    example: 400,
    description:
      'Code de statut HTTP, identique à celui de la réponse elle-même.',
  })
  statusCode: number;

  @ApiProperty({
    example: ['q3 must be a valid enum value'],
    description:
      "Détail de l'erreur. Un tableau de chaînes pour les erreurs de validation " +
      '(une entrée par champ invalide, avec le nom du champ dans le message), ' +
      "une chaîne unique pour les autres types d'erreur (ex. ressource introuvable, " +
      'erreur serveur générique).',
  })
  message: string | string[];

  @ApiProperty({
    example: 'Bad Request',
    description:
      'Libellé standard HTTP correspondant au statusCode (ex. "Bad Request", "Not Found").',
  })
  error: string;
}
