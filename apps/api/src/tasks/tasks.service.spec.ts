import { Task } from './task';
import { TasksRepository } from './tasks.repository';
import { LIST_LIMIT, TasksService } from './tasks.service';

const task: Task = {
  id: '0190a000-0000-7000-8000-000000000000',
  title: 'Write tests',
  status: 'todo',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('TasksService', () => {
  let repository: jest.Mocked<TasksRepository>;
  let service: TasksService;

  beforeEach(() => {
    repository = { create: jest.fn(), findRecent: jest.fn() };
    service = new TasksService(repository);
  });

  it('passes the new task to the repository and returns the stored task', async () => {
    repository.create.mockResolvedValue(task);

    await expect(service.create({ title: 'Write tests' })).resolves.toBe(task);
    expect(repository.create).toHaveBeenCalledWith({ title: 'Write tests' });
  });

  it('lists the newest tasks, capped at the list limit', async () => {
    repository.findRecent.mockResolvedValue([task]);

    await expect(service.list()).resolves.toEqual([task]);
    expect(repository.findRecent).toHaveBeenCalledWith(LIST_LIMIT);
    expect(LIST_LIMIT).toBe(100);
  });

  it('lets repository errors reach the caller', async () => {
    repository.findRecent.mockRejectedValue(new Error('store down'));

    await expect(service.list()).rejects.toThrow('store down');
  });
});
