import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { RequestLoggingMiddleware } from './logging/request-logging.middleware';
import { TasksModule } from './tasks/tasks.module';
import { createValidationPipe } from './validation';

@Module({
  imports: [
    HealthModule,
    TasksModule,
    // 100 requests per minute per IP for every route; POST /tasks has a tighter limit (see D11).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  // Registered here (not in main.ts) so e2e tests get the same pipe and guard as production.
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*path');
  }
}
