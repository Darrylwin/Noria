import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    environment: 'node',
    pool: 'forks',
    hookTimeout: 30000,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.enum.ts',
        // Infrastructure exclue de la couverture (décision explicite) :
        // logique de cycle de vie, adaptateurs et gestion d'erreurs
        // transverses, non couverts par choix.
        'src/prisma/prisma.service.ts',
        'src/common/logger/json.logger.ts',
        'src/common/filters/http-exception.filter.ts',
        'src/common/interceptors/logging.interceptor.ts',
        'src/health/health.controller.ts',
        'src/config/env.validation.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
