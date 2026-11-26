import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.constants';

// Longer than a healthy query ever takes, shorter than a load balancer's own probe timeout.
const CHECK_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger('Health');

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /** True when the database answers a trivial query in time. The cause is logged, never returned. */
  async isDatabaseUp(): Promise<boolean> {
    try {
      await withTimeout(this.pool.query('SELECT 1'), CHECK_TIMEOUT_MS);
      return true;
    } catch (error) {
      this.logger.error(`Database check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
