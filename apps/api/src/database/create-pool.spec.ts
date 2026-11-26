import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { createPool } from './create-pool';

jest.mock('pg');

describe('createPool', () => {
  const url = 'postgres://app:hunter2@localhost:5432/tasks';

  afterEach(() => jest.restoreAllMocks());

  it('limits connections, waiting time and statement time', () => {
    createPool(url);

    expect(Pool).toHaveBeenCalledWith({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 10_000,
    });
  });

  it('logs idle connection errors instead of crashing the process', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const pool = createPool(url);
    const [event, handler] = (pool.on as jest.Mock).mock.calls[0];

    handler(new Error('connection terminated'));

    expect(event).toBe('error');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('connection terminated'));
    expect(error).toHaveBeenCalledWith(expect.not.stringContaining('hunter2'));
  });
});
