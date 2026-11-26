import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { DATABASE_POOL } from './database.constants';
import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  it('closes the pool when the application shuts down', async () => {
    const pool = { end: jest.fn().mockResolvedValue(undefined) } as unknown as Pool;
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] })
      .overrideProvider(DATABASE_POOL)
      .useValue(pool)
      .compile();

    await moduleRef.get(DatabaseModule).onApplicationShutdown();

    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it('builds the pool from DATABASE_URL', async () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://app:secret@127.0.0.1:5432/tasks';
    try {
      const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();
      const pool = moduleRef.get<Pool>(DATABASE_POOL);

      expect(pool).toBeInstanceOf(Pool);
      await pool.end();
    } finally {
      // Assigning undefined would store the string "undefined", so delete instead.
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
