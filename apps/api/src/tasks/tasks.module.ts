import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PostgresTasksRepository } from './postgres-tasks.repository';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    // The controller and service only know the abstract TasksRepository (D6).
    { provide: TasksRepository, useClass: PostgresTasksRepository },
  ],
})
export class TasksModule {}
