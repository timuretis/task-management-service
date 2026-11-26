import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig } from '../config';
import { createPool } from './create-pool';
import { DATABASE_POOL } from './database.constants';

@Module({
  providers: [{ provide: DATABASE_POOL, useFactory: () => createPool(loadConfig().databaseUrl) }],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // Runs on SIGTERM through the shutdown hooks, so in-flight queries finish and connections close.
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
