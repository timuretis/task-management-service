import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  // Creating is the only write, so it gets a tighter limit than reads (see D11).
  // Nest answers POST with 201 by default.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(dto);
  }
}
