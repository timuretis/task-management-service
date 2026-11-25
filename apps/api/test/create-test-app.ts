import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/config';

/** Builds the real app (same module and setup as production) with an in-memory store. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, loadConfig({ NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' }));
  await app.init();
  return app;
}
