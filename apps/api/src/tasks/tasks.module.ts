import { Module } from '@nestjs/common';
import { InMemoryTasksRepository } from './in-memory-tasks.repository';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    // Phase 2 swaps this for the Postgres repository; nothing else changes.
    { provide: TasksRepository, useClass: InMemoryTasksRepository },
  ],
})
export class TasksModule {}
