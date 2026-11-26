import { act, renderHook } from '@testing-library/react';
import { ApiError, getHealth } from '../api/client';
import type { Health } from '../api/types';
import { HEALTH_POLL_MS, useHealth } from './useHealth';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getHealth: vi.fn(),
}));

const health: Health = { status: 'ok', uptime: 5, timestamp: '2026-01-01T00:00:00.000Z' };
const getHealthMock = vi.mocked(getHealth);

// Lets pending promises settle inside act(), then optionally moves the fake clock forward.
async function advance(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getHealthMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is loading until the first answer, then online', async () => {
    getHealthMock.mockResolvedValue(health);

    const { result } = renderHook(() => useHealth());
    expect(result.current).toEqual({ data: null, isLoading: true });
    await advance();

    expect(result.current).toEqual({ data: health, isLoading: false });
  });

  it('is offline when the request fails', async () => {
    getHealthMock.mockRejectedValue(new ApiError('Cannot reach the server.'));

    const { result } = renderHook(() => useHealth());
    await advance();

    expect(result.current).toEqual({ data: null, isLoading: false });
  });

  it('is offline when the API answers 503', async () => {
    getHealthMock.mockRejectedValue(new ApiError('The server had a problem.', 503));

    const { result } = renderHook(() => useHealth());
    await advance();

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('checks again every 30 seconds and follows the API going down and coming back', async () => {
    getHealthMock.mockResolvedValueOnce(health);
    const { result } = renderHook(() => useHealth());
    await advance();
    expect(result.current.data).toEqual(health);

    getHealthMock.mockRejectedValueOnce(new ApiError('down'));
    await advance(HEALTH_POLL_MS);
    expect(result.current.data).toBeNull();

    getHealthMock.mockResolvedValueOnce(health);
    await advance(HEALTH_POLL_MS);
    expect(result.current.data).toEqual(health);
    expect(getHealthMock).toHaveBeenCalledTimes(3);
  });

  it('does not show "checking" again during a later check', async () => {
    getHealthMock.mockResolvedValue(health);
    const { result } = renderHook(() => useHealth());
    await advance();

    getHealthMock.mockReturnValue(new Promise(() => {}));
    await advance(HEALTH_POLL_MS);

    expect(result.current).toEqual({ data: health, isLoading: false });
  });

  it('stops polling when the component unmounts', async () => {
    getHealthMock.mockResolvedValue(health);
    const { unmount } = renderHook(() => useHealth());
    await advance();
    expect(getHealthMock).toHaveBeenCalledTimes(1);

    unmount();
    await advance(HEALTH_POLL_MS * 3);

    expect(getHealthMock).toHaveBeenCalledTimes(1);
  });
});
