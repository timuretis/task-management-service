import { Injectable } from '@nestjs/common';
import { NewTask, Task } from './task';
import { TasksRepository } from './tasks.repository';

// Caps the response size so one request can't load every task (see D10).
export const LIST_LIMIT = 100;

@Injectable()
export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  create(newTask: NewTask): Promise<Task> {
    return this.repository.create(newTask);
  }

  list(): Promise<Task[]> {
    return this.repository.findRecent(LIST_LIMIT);
  }
}
