import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { RequestLoggingMiddleware } from './logging/request-logging.middleware';
import { TasksModule } from './tasks/tasks.module';
import { createValidationPipe } from './validation';

@Module({
  imports: [HealthModule, TasksModule],
  // Registered here (not in main.ts) so e2e tests get the same validation as production.
  providers: [{ provide: APP_PIPE, useFactory: createValidationPipe }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*path');
  }
}
