import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/config';

/**
 * Builds the real app (same module and setup as production) with an in-memory store.
 * `customize` lets a test replace a provider, e.g. to make the repository fail.
 */
export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await customize(builder).compile();
  const app = moduleRef.createNestApplication();
  configureApp(
    app,
    loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      // Placeholder until the pg-mem harness replaces the store (phase 2, task 8).
      DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/tasks_test',
    }),
  );
  await app.init();
  return app;
}
