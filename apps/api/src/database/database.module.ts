import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig } from '../config';
import { createPool } from './create-pool';
import { DATABASE_POOL } from './database.constants';

@Module({
  providers: [{ provide: DATABASE_POOL, useFactory: () => createPool(loadConfig().databaseUrl) }],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // Nest runs this after the HTTP server has stopped, so requests still in flight can finish their
  // queries first. onModuleDestroy would run earlier and could end the pool under them.
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
