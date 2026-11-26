// These mirror what the API returns (apps/api); the server stays the source of truth.
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
}

export interface NewTask {
  title: string;
  description?: string;
}

export interface Health {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}
