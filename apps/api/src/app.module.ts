import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';
import { createValidationPipe } from './validation';

@Module({
  imports: [HealthModule, TasksModule],
  // Registered here (not in main.ts) so e2e tests get the same validation as production.
  providers: [{ provide: APP_PIPE, useFactory: createValidationPipe }],
})
export class AppModule {}
