import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { NewTask, Task } from './task';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class InMemoryTasksRepository extends TasksRepository {
  // Grows without bound; fine for phase 1 (data is lost on restart, writes are rate limited).
  private readonly tasks: Task[] = [];

  async create(newTask: NewTask): Promise<Task> {
    const task: Task = {
      id: uuidv7(),
      title: newTask.title,
      description: newTask.description,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    return task;
  }

  async findRecent(limit: number): Promise<Task[]> {
    // Tasks are appended in creation order, so the newest are at the end.
    // Math.max avoids slice(-0), which would return every task when limit is 0.
    return this.tasks.slice(Math.max(0, this.tasks.length - limit)).reverse();
  }
}
