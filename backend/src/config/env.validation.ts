import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
  ValidationError,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // Validée comme URL avec le protocole postgresql:// (protocols explicites), pour détecter
  // une chaîne de connexion malformée au démarrage plutôt qu'au moment de la connexion Prisma.
  // require_tld: false pour accepter un hôte local sans domaine complet (ex. localhost).
  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ['postgresql', 'postgres'], require_tld: false })
  DATABASE_URL: string;

  // require_tld: false pour accepter http://localhost:3000 en développement (voir .env.example).
  // IsUrl rejette aussi une valeur comme '*', qui n'est jamais autorisée pour le CORS.
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  FRONTEND_ORIGIN: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Erreur de configuration : ${formatValidationErrors(errors)}`,
    );
  }

  return validated;
}

// ValidationError n'a pas de toString() exploitable : sans ce formatage explicite, une
// erreur de configuration au démarrage afficherait "[object Object]" au lieu du nom de la
// variable fautive et de la règle violée, ce qui rendrait le message inutile pour corriger
// le problème (voir point 1 du diagnostic).
function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .flatMap((error) => Object.values(error.constraints ?? {}))
    .join(' | ');
}
