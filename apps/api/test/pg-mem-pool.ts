import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { DataType, newDb } from 'pg-mem';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

// node-pg-migrate files hold "-- Up Migration" and "-- Down Migration" sections; only Up is applied.
function upSql(file: string): string {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  return sql.split('-- Down Migration')[0].replace('-- Up Migration', '');
}

/**
 * A fresh in-process Postgres emulator with the real migrations applied (D21).
 * It is not exact Postgres: the opt-in suite against a real database covers the differences.
 */
export interface PgMemDatabase {
  /** A new pool on the same data. Each app closes its own pool on shutdown. */
  createPool(): Pool;
}

export function createPgMemDatabase(): PgMemDatabase {
  const db = newDb();
  // pg-mem lacks btrim() and length(), which the title CHECK uses. JS trim() also strips tabs and
  // newlines, which real btrim() keeps, so only the opt-in real-Postgres suite proves that detail.
  db.public.registerFunction({
    name: 'btrim',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (text: string) => text.trim(),
  });
  db.public.registerFunction({
    name: 'length',
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (text: string) => text.length,
  });
  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    db.public.none(upSql(file));
  }
  const { Pool: PgMemPool } = db.adapters.createPg();
  return { createPool: () => new PgMemPool() };
}

/** Shortcut for a test that needs one app on its own fresh database. */
export function createPgMemPool(): Pool {
  return createPgMemDatabase().createPool();
}
