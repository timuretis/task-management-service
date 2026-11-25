import { InMemoryTasksRepository } from './in-memory-tasks.repository';

describe('InMemoryTasksRepository', () => {
  let repository: InMemoryTasksRepository;

  beforeEach(() => {
    repository = new InMemoryTasksRepository();
  });

  it('creates a todo task with a UUIDv7 id and a timestamp', async () => {
    const task = await repository.create({ title: 'Write spec', description: 'Phase 1' });

    expect(task).toMatchObject({ title: 'Write spec', description: 'Phase 1', status: 'todo' });
    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
  });

  it('returns an empty list when there are no tasks', async () => {
    await expect(repository.findRecent(10)).resolves.toEqual([]);
  });

  it('returns nothing for a limit of 0', async () => {
    await repository.create({ title: 'only' });

    await expect(repository.findRecent(0)).resolves.toEqual([]);
  });

  it('lists the newest tasks first, capped at the limit', async () => {
    for (const title of ['first', 'second', 'third']) {
      await repository.create({ title });
    }

    const titles = (await repository.findRecent(2)).map((task) => task.title);

    expect(titles).toEqual(['third', 'second']);
  });
});
