import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { PrismaClient } from '@prisma/client';
import supertest from 'supertest';

const VALID_PAYLOAD = {
  q1: 'REGISTERED',
  q2: 'YES',
  q3: 'MOSTLY_UP_TO_DATE',
  q4: 'PARTIALLY_ORGANIZED',
  q5: 'SIMPLE_SOFTWARE',
  q6: 'SYSTEMATICALLY',
  q7: 'UNDER_ONE_YEAR_OLD',
  q8: 'INFORMAL',
  q9: 'APPROXIMATE',
  q10: 'IDENTIFIED_NOT_DOCUMENTED',
};

let app: INestApplication;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  prisma = new PrismaClient();

  await prisma.diagnosticAnswer.deleteMany();
  await prisma.diagnosticSubmission.deleteMany();
});

afterAll(async () => {
  await prisma.diagnosticAnswer.deleteMany();
  await prisma.diagnosticSubmission.deleteMany();
  await prisma.$disconnect();
  await app.close();
});

describe('GET /health', () => {
  it('retourne 200 avec { status: "ok" }', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('GET /questions', () => {
  it('retourne 200 avec les 10 questions', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/questions')
      .expect(200);

    expect(response.body).toHaveLength(10);
  });

  it('chaque question a un code, une dimension, un ordre et des options', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/questions')
      .expect(200);

    for (const question of response.body) {
      expect(question).toHaveProperty('code');
      expect(question).toHaveProperty('dimension');
      expect(question).toHaveProperty('order');
      expect(question).toHaveProperty('label');
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('POST /diagnostics', () => {
  it('payload valide : retourne 201 avec le résultat complet', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(VALID_PAYLOAD)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('globalScore');
    expect(response.body).toHaveProperty('maturityLevel');
    expect(response.body).toHaveProperty('maturityLabel');
    expect(response.body).toHaveProperty('maturityDescription');
    expect(response.body).toHaveProperty('scores');
    expect(response.body.scores).toHaveProperty('formalization');
    expect(response.body.scores).toHaveProperty('accounting');
    expect(response.body.scores).toHaveProperty('funding');
    expect(response.body).toHaveProperty('strongestDimension');
    expect(response.body).toHaveProperty('improvementFocus');
    expect(response.body).toHaveProperty('cascadeTriggered');
    expect(response.body).toHaveProperty('mainRecommendation');
    expect(response.body).toHaveProperty('secondaryRecommendations');
  });

  it('payload valide : la soumission est persistée en base', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(VALID_PAYLOAD)
      .expect(201);

    const submission = await prisma.diagnosticSubmission.findUnique({
      where: { id: response.body.id },
      include: { answers: true },
    });

    expect(submission).not.toBeNull();
    expect(submission!.answers).toHaveLength(10);
  });

  it('champ manquant : retourne 400', async () => {
    const { q1: _omitted, ...withoutQ1 } = VALID_PAYLOAD;

    const response = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(withoutQ1)
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('q1')]),
    );
  });

  it('valeur invalide pour un champ : retourne 400', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send({ ...VALID_PAYLOAD, q3: 'VALEUR_INVALIDE' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('q3')]),
    );
  });

  it('propriété inconnue dans le payload : retourne 400', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send({ ...VALID_PAYLOAD, champInconnu: 'valeur' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('chaque appel crée une nouvelle soumission (non idempotent)', async () => {
    const r1 = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(VALID_PAYLOAD)
      .expect(201);

    const r2 = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(VALID_PAYLOAD)
      .expect(201);

    expect(r1.body.id).not.toBe(r2.body.id);
  });
});

describe('GET /diagnostics/:id', () => {
  it('id existant : retourne 200 avec le résultat correct', async () => {
    const created = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(VALID_PAYLOAD)
      .expect(201);

    const response = await supertest(app.getHttpServer())
      .get(`/diagnostics/${created.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.globalScore).toBe(created.body.globalScore);
    expect(response.body.maturityLevel).toBe(created.body.maturityLevel);
    expect(response.body.mainRecommendation).toBe(
      created.body.mainRecommendation,
    );
  });

  it('id inexistant : retourne 404', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/diagnostics/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body.statusCode).toBe(404);
  });

  it('rechargement : résultat identique à la soumission initiale', async () => {
    const created = await supertest(app.getHttpServer())
      .post('/diagnostics')
      .send(VALID_PAYLOAD)
      .expect(201);

    const reloaded = await supertest(app.getHttpServer())
      .get(`/diagnostics/${created.body.id}`)
      .expect(200);

    expect(reloaded.body).toMatchObject({
      id: created.body.id,
      globalScore: created.body.globalScore,
      maturityLevel: created.body.maturityLevel,
      maturityLabel: created.body.maturityLabel,
      cascadeTriggered: created.body.cascadeTriggered,
      mainRecommendation: created.body.mainRecommendation,
    });
  });
});
