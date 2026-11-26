import { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let isDatabaseUp: jest.Mock;
  let status: jest.Mock;
  let controller: HealthController;

  beforeEach(() => {
    isDatabaseUp = jest.fn();
    status = jest.fn();
    controller = new HealthController({ isDatabaseUp } as unknown as HealthService);
    jest.spyOn(process, 'uptime').mockReturnValue(12.9);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reports ok with whole-second uptime and an ISO timestamp when the database is up', async () => {
    isDatabaseUp.mockResolvedValue(true);

    await expect(controller.check({ status } as unknown as Response)).resolves.toEqual({
      status: 'ok',
      uptime: 12,
      timestamp: '2026-01-02T03:04:05.000Z',
    });
    expect(status).not.toHaveBeenCalled();
  });

  it('answers 503 with status error when the database is down', async () => {
    isDatabaseUp.mockResolvedValue(false);

    const body = await controller.check({ status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(503);
    expect(body.status).toBe('error');
  });
});
