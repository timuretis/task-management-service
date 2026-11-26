import type { Health, NewTask, Task } from './types';

const DEFAULT_API_URL = 'http://localhost:3000';
// Without a limit, a server that accepts the connection but never answers would hang the page.
const REQUEST_TIMEOUT_MS = 10_000;

/** Every failure becomes one of these, with a message that is safe to show to a person. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Read on each call (not at import time) so tests can change it.
function apiUrl(path: string): string {
  const configured = import.meta.env.VITE_API_URL;
  // A production build without it would quietly call localhost and fail with no clue why.
  if (!configured && import.meta.env.PROD) {
    throw new ApiError('The app is not configured: VITE_API_URL was not set when it was built.');
  }
  return `${(configured || DEFAULT_API_URL).replace(/\/+$/, '')}${path}`;
}

// The API answers 400 with `message` as a list of problems, or as one string.
// Only text is accepted: a proxy could send an object, and React cannot render an object as text.
function badRequestMessage(body: unknown, status: number): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    const texts = message.filter((item): item is string => typeof item === 'string');
    if (texts.length > 0) return texts.join('. ');
  }
  return `Request failed (${status})`;
}

async function toApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  if (status === 429)
    return new ApiError('Too many requests. Please try again in a minute.', status);
  if (status >= 500) return new ApiError('The server had a problem. Please try again.', status);
  const body: unknown = await response.json().catch(() => null);
  return new ApiError(badRequestMessage(body, status), status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Offline, DNS failure, CORS block or timeout: the browser gives no detail we could show.
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }
  if (!response.ok) throw await toApiError(response);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('The server sent an unexpected response.', response.status);
  }
}

/** Rejects with an ApiError when the API is down or unhealthy (a 503 counts as down). */
export function getHealth(): Promise<Health> {
  return request<Health>('/health');
}

export function getTasks(): Promise<Task[]> {
  return request<Task[]>('/tasks');
}

export function createTask(newTask: NewTask): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTask),
  });
}
