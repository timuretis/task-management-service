import { Task } from './task';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const task: Task = {
  id: '0190a000-0000-7000-8000-000000000000',
  title: 'Write tests',
  status: 'todo',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('TasksController', () => {
  let service: jest.Mocked<Pick<TasksService, 'list' | 'create'>>;
  let controller: TasksController;

  beforeEach(() => {
    service = { list: jest.fn(), create: jest.fn() };
    controller = new TasksController(service as unknown as TasksService);
  });

  it('returns the tasks from the service', async () => {
    service.list.mockResolvedValue([task]);

    await expect(controller.list()).resolves.toEqual([task]);
  });

  it('creates a task from the DTO', async () => {
    service.create.mockResolvedValue(task);

    await expect(controller.create({ title: 'Write tests' })).resolves.toBe(task);
    expect(service.create).toHaveBeenCalledWith({ title: 'Write tests' });
  });
});
