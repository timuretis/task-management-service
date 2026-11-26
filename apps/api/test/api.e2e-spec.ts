import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { TasksRepository } from '../src/tasks/tasks.repository';
import { createTestApp } from './create-test-app';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (body: object) => request(app.getHttpServer()).post('/tasks').send(body);

  describe('GET /health', () => {
    it('reports status, uptime and timestamp', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  describe('POST /tasks and GET /tasks', () => {
    it('starts with an empty list', async () => {
      await request(app.getHttpServer()).get('/tasks').expect(200, []);
    });

    it('creates a task with server-set fields', async () => {
      const res = await post({ title: '  Buy milk ', description: '2 litres' }).expect(201);

      expect(res.body).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        title: 'Buy milk',
        description: '2 litres',
        status: 'todo',
        createdAt: expect.any(String),
      });
    });

    it('lists created tasks, newest first', async () => {
      await post({ title: 'first' }).expect(201);
      await post({ title: 'second' }).expect(201);

      const res = await request(app.getHttpServer()).get('/tasks').expect(200);

      expect(res.body.map((task: { title: string }) => task.title)).toEqual(['second', 'first']);
    });

    it('returns at most 100 tasks', async () => {
      // Seed through the repository: 105 POSTs would hit the 20-per-minute create limit.
      const repository = app.get(TasksRepository);
      for (let i = 0; i < 105; i++) await repository.create({ title: `task ${i}` });

      const res = await request(app.getHttpServer()).get('/tasks').expect(200);

      expect(res.body).toHaveLength(100);
      expect(res.body[0].title).toBe('task 104');
    });
  });

  describe('validation errors', () => {
    it.each([
      ['a missing title', {}, 'title should not be empty'],
      ['an empty title', { title: '' }, 'title should not be empty'],
      ['a whitespace-only title', { title: '   ' }, 'title should not be empty'],
      ['a title over 200 characters', { title: 'a'.repeat(201) }, 'title must be shorter'],
      ['a client-chosen id', { title: 'ok', id: 'x' }, 'property id should not exist'],
      [
        'a client-chosen status',
        { title: 'ok', status: 'done' },
        'property status should not exist',
      ],
    ])('answers 400 for %s', async (_name, body, message) => {
      const res = await post(body).expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(res.body.message.join(' ')).toContain(message);
    });

    it('stores nothing when validation fails', async () => {
      await post({ title: '' }).expect(400);

      await request(app.getHttpServer()).get('/tasks').expect(200, []);
    });
  });

  describe('errors and request ids', () => {
    it('answers 404 with the standard body for an unknown route', async () => {
      const res = await request(app.getHttpServer()).get('/nope').expect(404);

      expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('answers 413 with the standard body for a body over 100 KB', async () => {
      const res = await post({ title: 'ok', description: 'a'.repeat(101 * 1024) }).expect(413);

      expect(res.body).toMatchObject({ statusCode: 413, error: 'Payload Too Large' });
    });

    it('echoes a valid x-request-id', async () => {
      const res = await request(app.getHttpServer()).get('/health').set('x-request-id', 'abc-123');

      expect(res.headers['x-request-id']).toBe('abc-123');
    });

    it('generates an x-request-id when none is sent', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});

describe('API with a failing store (e2e)', () => {
  it('answers 500 without leaking internal details', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const failing = { findRecent: () => Promise.reject(new Error('relation "tasks" is missing')) };
    const app = await createTestApp({
      customize: (builder) => builder.overrideProvider(TasksRepository).useValue(failing),
    });

    const res = await request(app.getHttpServer()).get('/tasks').expect(500);

    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    await app.close();
    jest.restoreAllMocks();
  });
});
