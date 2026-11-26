import { useCallback, useEffect, useState } from 'react';
import { ApiError, createTask as postTask, getTasks } from '../api/client';
import type { NewTask, Task } from '../api/types';

export interface UseTasks {
  tasks: Task[];
  isLoading: boolean;
  /** A message for the list, set when loading failed. */
  error: string | null;
  reload: () => void;
  /** Rejects with an ApiError; the form shows its message next to the fields. */
  createTask: (newTask: NewTask) => Promise<void>;
}

// Tasks created while the list was still loading are newer than anything in the answer, so they
// stay on top. Without this, a slow answer would wipe a task the person just added.
function mergeNewer(current: Task[], loaded: Task[]): Task[] {
  const loadedIds = new Set(loaded.map((task) => task.id));
  return [...current.filter((task) => !loadedIds.has(task.id)), ...loaded];
}

/** Loads the task list and adds new tasks to the top of it. */
export function useTasks(): UseTasks {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Changing this number re-runs the loading effect below; that is how "Retry" works.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    getTasks()
      .then((loaded) => setTasks((current) => mergeNewer(current, loaded)))
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'),
      )
      .finally(() => setIsLoading(false));
  }, [attempt]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const createTask = useCallback(async (newTask: NewTask) => {
    const created = await postTask(newTask);
    setTasks((current) => [created, ...current]);
  }, []);

  return { tasks, isLoading, error, reload, createTask };
}
