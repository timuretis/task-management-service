import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import request from 'supertest';
import { createTestApp } from './create-test-app';

describe('Hardening (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // A fresh app per test also gives each test fresh rate-limit counters.
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('sets security headers from helmet', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured CORS origin only', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    const other = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://evil.test');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects a body over 100 KB with 413', async () => {
    const body = { title: 'ok', description: 'a'.repeat(101 * 1024) };

    await request(app.getHttpServer()).post('/tasks').send(body).expect(413);
  });

  it('limits POST /tasks to 20 requests per minute, then answers 429', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: `task ${i}` })
        .expect(201);
    }

    await request(app.getHttpServer()).post('/tasks').send({ title: 'one too many' }).expect(429);
  });

  it('limits all routes to 100 requests per minute, then answers 429', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get('/tasks').expect(200);
    }

    await request(app.getHttpServer()).get('/tasks').expect(429);
  });

  it('never rate limits /health, so load balancer probes keep working', async () => {
    for (let i = 0; i < 101; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });

  describe('behind a reverse proxy', () => {
    // Fills the 20-per-minute POST budget for one forwarded client, then sends one more.
    async function exhaustPostLimit(server: Server, ip: string): Promise<void> {
      for (let i = 0; i < 20; i++) {
        await request(server)
          .post('/tasks')
          .set('X-Forwarded-For', ip)
          .send({ title: 't' })
          .expect(201);
      }
    }

    it('counts every client as one when TRUST_PROXY is off', async () => {
      await exhaustPostLimit(app.getHttpServer(), '203.0.113.1');

      await request(app.getHttpServer())
        .post('/tasks')
        .set('X-Forwarded-For', '203.0.113.2')
        .send({ title: 'other client' })
        .expect(429);
    });

    it('limits each client by X-Forwarded-For when TRUST_PROXY=1', async () => {
      await app.close();
      app = await createTestApp({ env: { TRUST_PROXY: '1' } });
      await exhaustPostLimit(app.getHttpServer(), '203.0.113.1');

      await request(app.getHttpServer())
        .post('/tasks')
        .set('X-Forwarded-For', '203.0.113.1')
        .send({ title: 'same client' })
        .expect(429);
      await request(app.getHttpServer())
        .post('/tasks')
        .set('X-Forwarded-For', '203.0.113.2')
        .send({ title: 'other client' })
        .expect(201);
    });
  });
});
