import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/config';
import { DATABASE_POOL } from '../src/database/database.constants';
import { createPgMemPool } from './pg-mem-pool';

interface TestAppOptions {
  /** Share a pool between apps, e.g. to prove data survives a restart. Default: a fresh pg-mem database. */
  pool?: Pool;
  /** Extra environment variables for loadConfig, e.g. TRUST_PROXY. */
  env?: NodeJS.ProcessEnv;
  /** Replace a provider, e.g. to make the repository fail. */
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

/** Builds the real app (same module and setup as production) on an in-memory Postgres emulator. */
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication> {
  const { pool = createPgMemPool(), env = {}, customize = (builder) => builder } = options;
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_POOL)
    .useValue(pool);
  const moduleRef = await customize(builder).compile();
  const app = moduleRef.createNestApplication();
  configureApp(
    app,
    loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/tasks_test',
      ...env,
    }),
  );
  await app.init();
  return app;
}
