import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateTaskDto } from './create-task.dto';
import { Task } from './task';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(): Promise<Task[]> {
    return this.tasksService.list();
  }

  // Nest answers POST with 201 by default.
  @Post()
  create(@Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(dto);
  }
}
