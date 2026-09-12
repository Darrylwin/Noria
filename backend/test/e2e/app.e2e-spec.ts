import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import {
  Q10Answer,
  Q1Answer,
  Q2Answer,
  Q3Answer,
  Q4Answer,
  Q5Answer,
  Q6Answer,
  Q7Answer,
  Q8Answer,
  Q9Answer,
} from '../../src/diagnostic/enums/answers.enum.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

describe('Noria API (E2E)', () => {
  let app: INestApplication;
  let createdDiagnosticId: string;

  /**
   * Helper pour obtenir une réponse valide pour chaque enum d'entrée.
   */
  const getValidPayload = () => ({
    q1: Object.values(Q1Answer)[0],
    q2: Object.values(Q2Answer)[0],
    q3: Object.values(Q3Answer)[0],
    q4: Object.values(Q4Answer)[0],
    q5: Object.values(Q5Answer)[0],
    q6: Object.values(Q6Answer)[0],
    q7: Object.values(Q7Answer)[0],
    q8: Object.values(Q8Answer)[0],
    q9: Object.values(Q9Answer)[0],
    q10: Object.values(Q10Answer)[0],
  });

  const mockSubmissionRow = {
    id: 'uuid-mocked',
    formalizationScore: 80,
    accountingRawScore: 75,
    accountingFinalScore: 75,
    fundingRawScore: 70,
    fundingFinalScore: 70,
    globalScore: 76,
    maturityLevel: 'ADVANCED',
    strongestDimension: 'FORMALIZATION',
    improvementFocus: 'FUNDING',
    cascadeTriggered: false,
    scoringEngineVersion: 'v1',
    answers: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: vi.fn(),
        onModuleDestroy: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
        diagnosticSubmission: {
          create: vi.fn().mockImplementation(async () => mockSubmissionRow),
          findUnique: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === mockSubmissionRow.id) {
              return mockSubmissionRow;
            }
            return null;
          }),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Configuration identique au main.ts du projet
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/health', () => {
    it('devrait retourner un statut 200 et valider la santé de la BDD', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toEqual({ database: 'up' });
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1/questions', () => {
    it('devrait retourner la liste complète des 10 questions du catalogue', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/questions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(10);
      expect(response.body[0]).toHaveProperty('code', 'Q1');
    });
  });

  describe('Workflow /api/v1/diagnostics', () => {
    it('devrait rejeter un payload invalide avec une erreur 400 Bad Request', async () => {
      const invalidPayload = {
        ...getValidPayload(),
        q1: 'INVALID_ANSWER_CODE',
      };

      await request(app.getHttpServer())
        .post('/api/v1/diagnostics')
        .send(invalidPayload)
        .expect(400);
    });

    it('devrait rejeter un payload contenant des clés non autorisées (forbidNonWhitelisted)', async () => {
      const payloadWithExtra = {
        ...getValidPayload(),
        unexpectedField: 'HACK',
      };

      await request(app.getHttpServer())
        .post('/api/v1/diagnostics')
        .send(payloadWithExtra)
        .expect(400);
    });

    it('devrait créer un diagnostic avec succès (201 Created) et persister le résultat', async () => {
      const validPayload = getValidPayload();

      const response = await request(app.getHttpServer())
        .post('/api/v1/diagnostics')
        .send(validPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('globalScore');
      expect(response.body).toHaveProperty('maturityLevel');
      expect(response.body).toHaveProperty('scores');
      expect(response.body).toHaveProperty('mainRecommendation');

      // Conservation de l'ID pour le test de consultation GET
      createdDiagnosticId = response.body.id;
    });

    it('devrait récupérer le diagnostic créé via GET /api/v1/diagnostics/:id', async () => {
      expect(createdDiagnosticId).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/diagnostics/${createdDiagnosticId}`)
        .expect(200);

      expect(response.body.id).toBe(createdDiagnosticId);
      expect(response.body).toHaveProperty('globalScore');
      expect(response.body).toHaveProperty('maturityLevel');
    });

    it("devrait renvoyer un statut 404 Not Found si l'ID n'existe pas", async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/v1/diagnostics/${nonExistentUuid}`)
        .expect(404);
    });
  });
});
