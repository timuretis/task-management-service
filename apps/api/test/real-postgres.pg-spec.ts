import { join } from 'node:path';
import { Pool } from 'pg';
import runner from 'node-pg-migrate';
import request from 'supertest';
import { PostgresTasksRepository } from '../src/tasks/postgres-tasks.repository';
import { createTestApp } from './create-test-app';

/**
 * Opt-in suite against a real PostgreSQL (D21). It runs only when TEST_DATABASE_URL is set,
 * e.g. postgres://tasks:tasks@127.0.0.1:5432/tasks_test, and proves what pg-mem cannot:
 * the real migration, the constraints, the index and the ordering.
 */
const databaseUrl = process.env.TEST_DATABASE_URL;

// This suite drops the whole schema, so it must never touch a development database.
if (databaseUrl && !new URL(databaseUrl).pathname.slice(1).endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point to a database whose name ends in _test');
}

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

async function migrate(direction: 'up' | 'down', count: number): Promise<void> {
  await runner({
    databaseUrl: databaseUrl as string,
    dir: MIGRATIONS_DIR,
    direction,
    count,
    migrationsTable: 'pgmigrations',
    log: () => {},
  });
}

async function insertTask(pool: Pool, id: string, createdAt: string, title = 't'): Promise<void> {
  await pool.query('INSERT INTO tasks (id, title, created_at) VALUES ($1, $2, $3)', [
    id,
    title,
    createdAt,
  ]);
}

const uuid = (n: number): string => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;

(databaseUrl ? describe : describe.skip)('Real PostgreSQL (opt-in)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await migrate('up', Infinity);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE tasks');
  });

  describe('migration', () => {
    it('creates the tasks table with the planned columns', async () => {
      const { rows } = await pool.query(
        `SELECT column_name, data_type, is_nullable, character_maximum_length
         FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position`,
      );

      expect(rows).toEqual([
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', character_maximum_length: null },
        {
          column_name: 'title',
          data_type: 'character varying',
          is_nullable: 'NO',
          character_maximum_length: 200,
        },
        {
          column_name: 'description',
          data_type: 'character varying',
          is_nullable: 'YES',
          character_maximum_length: 2000,
        },
        {
          column_name: 'status',
          data_type: 'text',
          is_nullable: 'NO',
          character_maximum_length: null,
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
          character_maximum_length: null,
        },
      ]);
    });

    it('creates the list index on created_at and id, both descending', async () => {
      const { rows } = await pool.query(
        "SELECT indexdef FROM pg_indexes WHERE indexname = 'tasks_created_at_id_idx'",
      );

      expect(rows[0].indexdef).toContain('(created_at DESC, id DESC)');
    });

    it('can be rolled back and applied again', async () => {
      await migrate('down', 1);
      await expect(pool.query('SELECT 1 FROM tasks')).rejects.toThrow('does not exist');

      await migrate('up', Infinity);

      await expect(pool.query('SELECT 1 FROM tasks')).resolves.toBeDefined();
    });
  });

  describe('constraints', () => {
    it.each([
      ['a title of only spaces', ['   ', 'todo'], 'tasks_title_not_blank'],
      ['an unknown status', ['ok', 'archived'], 'tasks_status_valid'],
      ['a title over 200 characters', ['a'.repeat(201), 'todo'], undefined],
      ['a missing title', [null, 'todo'], undefined],
    ])('rejects %s', async (_name, [title, status], constraint) => {
      const insert = pool.query('INSERT INTO tasks (id, title, status) VALUES ($1, $2, $3)', [
        uuid(1),
        title,
        status,
      ]);

      await expect(insert).rejects.toMatchObject(constraint ? { constraint } : {});
    });

    it('rejects a description over 2000 characters', async () => {
      const insert = pool.query('INSERT INTO tasks (id, title, description) VALUES ($1, $2, $3)', [
        uuid(1),
        'ok',
        'a'.repeat(2001),
      ]);

      await expect(insert).rejects.toThrow('too long');
    });

    it('rejects a duplicate id', async () => {
      await insertTask(pool, uuid(1), '2026-01-01T00:00:00Z');

      await expect(insertTask(pool, uuid(1), '2026-01-02T00:00:00Z')).rejects.toMatchObject({
        constraint: 'tasks_pkey',
      });
    });

    it('applies the column defaults for status and created_at', async () => {
      await pool.query("INSERT INTO tasks (id, title) VALUES ($1, 'defaults')", [uuid(1)]);

      const { rows } = await pool.query('SELECT status, created_at FROM tasks');

      expect(rows[0].status).toBe('todo');
      expect(rows[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('PostgresTasksRepository', () => {
    it('lists newest first and breaks equal timestamps by id, descending', async () => {
      const repository = new PostgresTasksRepository(pool);
      await insertTask(pool, uuid(2), '2026-01-01T00:00:00Z', 'same time, lower id');
      await insertTask(pool, uuid(3), '2026-01-01T00:00:00Z', 'same time, higher id');
      await insertTask(pool, uuid(1), '2026-01-02T00:00:00Z', 'newest');

      const titles = (await repository.findRecent(10)).map((task) => task.title);

      expect(titles).toEqual(['newest', 'same time, higher id', 'same time, lower id']);
    });

    it('returns at most the limit, keeping the newest rows', async () => {
      const repository = new PostgresTasksRepository(pool);
      await pool.query(
        `INSERT INTO tasks (id, title, created_at)
         SELECT gen_random_uuid(), 'task ' || n, now() - (n || ' seconds')::interval
         FROM generate_series(1, 105) AS n`,
      );

      const tasks = await repository.findRecent(100);

      expect(tasks).toHaveLength(100);
      expect(tasks[0].title).toBe('task 1');
      expect(tasks[99].title).toBe('task 100');
    });

    it('stores and returns a task with its description', async () => {
      const repository = new PostgresTasksRepository(pool);

      const created = await repository.create({ title: 'Real row', description: 'in Postgres' });

      expect(created).toMatchObject({
        title: 'Real row',
        description: 'in Postgres',
        status: 'todo',
      });
      expect(await repository.findRecent(1)).toEqual([created]);
    });

    it('reads the list through the index, not a full sort', async () => {
      await pool.query(
        `INSERT INTO tasks (id, title, created_at)
         SELECT gen_random_uuid(), 'bulk', now() - (n || ' seconds')::interval
         FROM generate_series(1, 5000) AS n`,
      );
      await pool.query('ANALYZE tasks');

      const { rows } = await pool.query(
        'EXPLAIN SELECT * FROM tasks ORDER BY created_at DESC, id DESC LIMIT 100',
      );

      const plan = rows.map((row) => row['QUERY PLAN']).join('\n');
      expect(plan).toContain('tasks_created_at_id_idx');
      expect(plan).not.toContain('Sort');
    });
  });

  describe('HTTP API on the real database', () => {
    it('creates and lists a task, and rejects a whitespace title before the database', async () => {
      const app = await createTestApp({ pool: new Pool({ connectionString: databaseUrl }) });

      await request(app.getHttpServer()).post('/tasks').send({ title: '   ' }).expect(400);
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: ' Real ' })
        .expect(201);
      const list = await request(app.getHttpServer()).get('/tasks').expect(200);
      await app.close();

      expect(created.body.title).toBe('Real');
      expect(list.body).toEqual([created.body]);
    });
  });
});
