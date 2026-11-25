import { HealthController } from './health.controller';

describe('HealthController', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports ok with whole-second uptime and an ISO timestamp', () => {
    jest.spyOn(process, 'uptime').mockReturnValue(12.9);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T03:04:05.000Z'));

    expect(new HealthController().check()).toEqual({
      status: 'ok',
      uptime: 12,
      timestamp: '2026-01-02T03:04:05.000Z',
    });

    jest.useRealTimers();
  });
});
