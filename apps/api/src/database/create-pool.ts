import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

const logger = new Logger('Database');

/**
 * One pool per process (D20). The limits keep a slow or dead database from piling up work:
 * at most 10 connections, a 5 s wait for a free one, and a 10 s cap on any single statement.
 */
export function createPool(databaseUrl: string): Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
  });
  // An idle connection can fail (e.g. the database restarts). Without a listener, the
  // pool's 'error' event would crash the whole process.
  pool.on('error', (error) => logger.error(`Idle database connection failed: ${error.message}`));
  return pool;
}
