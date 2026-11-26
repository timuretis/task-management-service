import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError, createTask, getTasks } from '../api/client';
import type { Task } from '../api/types';
import { useTasks } from './useTasks';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getTasks: vi.fn(),
  createTask: vi.fn(),
}));

const getTasksMock = vi.mocked(getTasks);
const createTaskMock = vi.mocked(createTask);

function task(id: string, title: string): Task {
  return { id, title, status: 'todo', createdAt: '2026-01-01T00:00:00.000Z' };
}

describe('useTasks', () => {
  beforeEach(() => {
    getTasksMock.mockReset();
    createTaskMock.mockReset();
  });

  it('is loading first, then returns the tasks', async () => {
    getTasksMock.mockResolvedValue([task('1', 'first')]);

    const { result } = renderHook(() => useTasks());
    expect(result.current).toMatchObject({ tasks: [], isLoading: true, error: null });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tasks).toEqual([task('1', 'first')]);
    expect(result.current.error).toBeNull();
  });

  it('returns an empty list without an error when there are no tasks', async () => {
    getTasksMock.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toMatchObject({ tasks: [], error: null });
  });

  it('shows the message of an API error', async () => {
    getTasksMock.mockRejectedValue(new ApiError('Cannot reach the server.'));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Cannot reach the server.');
  });

  it('uses a generic message for an unexpected error', async () => {
    getTasksMock.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Something went wrong. Please try again.');
  });

  it('retries after an error and clears it on success', async () => {
    getTasksMock.mockRejectedValueOnce(new ApiError('down'));
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.error).toBe('down'));

    getTasksMock.mockResolvedValueOnce([task('1', 'first')]);
    act(() => result.current.reload());
    expect(result.current).toMatchObject({ isLoading: true, error: null });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tasks).toEqual([task('1', 'first')]);
    expect(result.current.error).toBeNull();
  });

  it('adds a created task at the top', async () => {
    getTasksMock.mockResolvedValue([task('1', 'old')]);
    createTaskMock.mockResolvedValue(task('2', 'new'));
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.createTask({ title: 'new' }));

    expect(createTaskMock).toHaveBeenCalledWith({ title: 'new' });
    expect(result.current.tasks.map((t) => t.title)).toEqual(['new', 'old']);
  });

  it('rejects with the API error and leaves the list alone when creating fails', async () => {
    getTasksMock.mockResolvedValue([task('1', 'old')]);
    createTaskMock.mockRejectedValue(new ApiError('title should not be empty', 400));
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(() => result.current.createTask({ title: '' }))).rejects.toThrow(
      'title should not be empty',
    );

    expect(result.current.tasks).toEqual([task('1', 'old')]);
  });

  describe('when a task is created while the list is still loading', () => {
    it('keeps the new task on top when the slow list answer arrives', async () => {
      let answerList: (tasks: Task[]) => void = () => {};
      getTasksMock.mockReturnValue(new Promise((resolve) => (answerList = resolve)));
      createTaskMock.mockResolvedValue(task('3', 'created meanwhile'));
      const { result } = renderHook(() => useTasks());

      await act(() => result.current.createTask({ title: 'created meanwhile' }));
      await act(async () => answerList([task('2', 'b'), task('1', 'a')]));

      expect(result.current.tasks.map((t) => t.title)).toEqual(['created meanwhile', 'b', 'a']);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not list a task twice when the answer already contains it', async () => {
      let answerList: (tasks: Task[]) => void = () => {};
      getTasksMock.mockReturnValue(new Promise((resolve) => (answerList = resolve)));
      createTaskMock.mockResolvedValue(task('3', 'created meanwhile'));
      const { result } = renderHook(() => useTasks());

      await act(() => result.current.createTask({ title: 'created meanwhile' }));
      await act(async () => answerList([task('3', 'created meanwhile'), task('1', 'a')]));

      expect(result.current.tasks.map((t) => t.id)).toEqual(['3', '1']);
    });
  });
});
