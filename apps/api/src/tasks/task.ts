export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
}

/** What a caller may choose; id, status and createdAt are set by the server. */
export interface NewTask {
  title: string;
  description?: string;
}
