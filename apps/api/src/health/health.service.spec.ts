import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let query: jest.Mock;
  let error: jest.SpyInstance;
  let service: HealthService;

  beforeEach(() => {
    query = jest.fn();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new HealthService({ query } as unknown as Pool);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('is up when the database answers', async () => {
    query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    await expect(service.isDatabaseUp()).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('is down, and logs the cause, when the query fails', async () => {
    query.mockRejectedValue(new Error('connection refused'));

    await expect(service.isDatabaseUp()).resolves.toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });

  it('is down when the database does not answer within 2 seconds', async () => {
    jest.useFakeTimers();
    query.mockReturnValue(new Promise(() => {}));

    const result = service.isDatabaseUp();
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('timed out after 2000 ms'));
  });
});
