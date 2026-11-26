import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { createPgMemDatabase } from './pg-mem-pool';

describe('Database behaviour (e2e)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps created tasks when the app restarts', async () => {
    const database = createPgMemDatabase();
    const first = await createTestApp({ pool: database.createPool() });
    const created = await request(first.getHttpServer())
      .post('/tasks')
      .send({ title: 'survives restart' })
      .expect(201);
    await first.close();

    const second = await createTestApp({ pool: database.createPool() });
    const list = await request(second.getHttpServer()).get('/tasks').expect(200);
    await second.close();

    expect(list.body).toEqual([created.body]);
  });

  it('keeps tasks of different apps apart when they use different databases', async () => {
    const one = await createTestApp();
    const two = await createTestApp();
    await request(one.getHttpServer()).post('/tasks').send({ title: 'only in one' }).expect(201);

    await request(two.getHttpServer()).get('/tasks').expect(200, []);
    await one.close();
    await two.close();
  });

  describe('when queries fail', () => {
    const failing = {
      query: () => Promise.reject(new Error('relation "tasks" does not exist at 10.0.0.5:5432')),
      end: () => Promise.resolve(),
    } as unknown as Pool;

    it.each([
      ['GET /tasks', (api: request.Agent) => api.get('/tasks')],
      ['POST /tasks', (api: request.Agent) => api.post('/tasks').send({ title: 'x' })],
    ])('answers a safe 500 for %s', async (_name, call) => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const app = await createTestApp({ pool: failing });

      const res = await call(request.agent(app.getHttpServer())).expect(500);

      expect(res.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/relation|10\.0\.0\.5/);
      await app.close();
    });
  });
});
