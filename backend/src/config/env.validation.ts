import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  FRONTEND_ORIGIN: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  PORT: number = 3001;

  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Erreur de configuration : ${errors.toString()}`);
  }

  return validated;
}
