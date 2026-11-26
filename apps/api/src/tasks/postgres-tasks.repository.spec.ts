import { Pool } from 'pg';
import { PostgresTasksRepository } from './postgres-tasks.repository';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const row = {
  id: '0190a000-0000-7000-8000-000000000000',
  title: 'Write tests',
  description: 'Phase 2',
  status: 'todo',
  created_at: new Date('2026-01-02T03:04:05.678Z'),
};

describe('PostgresTasksRepository', () => {
  let query: jest.Mock;
  let repository: PostgresTasksRepository;

  beforeEach(() => {
    query = jest.fn();
    repository = new PostgresTasksRepository({ query } as unknown as Pool);
  });

  describe('create', () => {
    it('inserts with parameters and a UUIDv7 id, and returns the stored task', async () => {
      query.mockResolvedValue({ rows: [row] });

      const task = await repository.create({ title: 'Write tests', description: 'Phase 2' });

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('INSERT INTO tasks');
      expect(sql).toContain('RETURNING');
      expect(sql).not.toContain('Write tests');
      expect(params[0]).toMatch(UUID_V7);
      expect(params.slice(1)).toEqual(['Write tests', 'Phase 2']);
      expect(task).toEqual({
        id: row.id,
        title: 'Write tests',
        description: 'Phase 2',
        status: 'todo',
        createdAt: '2026-01-02T03:04:05.678Z',
      });
    });

    it('stores a missing description as null and omits it from the result', async () => {
      query.mockResolvedValue({ rows: [{ ...row, description: null }] });

      const task = await repository.create({ title: 'Write tests' });

      expect(query.mock.calls[0][1][2]).toBeNull();
      expect(task).not.toHaveProperty('description');
    });

    it('lets database errors reach the caller', async () => {
      query.mockRejectedValue(new Error('connection refused'));

      await expect(repository.create({ title: 'x' })).rejects.toThrow('connection refused');
    });
  });

  describe('findRecent', () => {
    it('selects newest first with the limit as a parameter', async () => {
      query.mockResolvedValue({ rows: [row] });

      await repository.findRecent(100);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC, id DESC LIMIT $1'),
        [100],
      );
    });

    it('maps rows to tasks in the order the database returned them', async () => {
      const older = { ...row, id: 'b', title: 'older', description: null };
      query.mockResolvedValue({ rows: [row, older] });

      const tasks = await repository.findRecent(2);

      expect(tasks.map((task) => task.title)).toEqual(['Write tests', 'older']);
      expect(tasks[1]).not.toHaveProperty('description');
    });

    it('returns an empty list when there are no rows', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findRecent(10)).resolves.toEqual([]);
    });

    it('lets database errors reach the caller', async () => {
      query.mockRejectedValue(new Error('timeout'));

      await expect(repository.findRecent(10)).rejects.toThrow('timeout');
    });
  });
});
