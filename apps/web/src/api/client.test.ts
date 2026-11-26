import { ApiError, createTask, getHealth, getTasks } from './client';

const task = {
  id: '0190a000-0000-7000-8000-000000000000',
  title: 'Write tests',
  status: 'todo',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function reply(status: number, body?: unknown): Response {
  const text = body === undefined ? 'not json' : JSON.stringify(body);
  return new Response(text, { status, headers: { 'Content-Type': 'application/json' } });
}

describe('API client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('requests', () => {
    it('gets the task list from VITE_API_URL', async () => {
      fetchMock.mockResolvedValue(reply(200, [task]));

      await expect(getTasks()).resolves.toEqual([task]);
      expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/tasks');
    });

    it('ignores a trailing slash in VITE_API_URL', async () => {
      vi.stubEnv('VITE_API_URL', 'http://api.test/');
      fetchMock.mockResolvedValue(reply(200, []));

      await getTasks();

      expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/tasks');
    });

    it('falls back to the local API when VITE_API_URL is not set', async () => {
      vi.stubEnv('VITE_API_URL', undefined as unknown as string);
      fetchMock.mockResolvedValue(reply(200, []));

      await getTasks();

      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/tasks');
    });

    it('refuses to guess the API address in a production build', async () => {
      vi.stubEnv('PROD', true);
      vi.stubEnv('VITE_API_URL', undefined as unknown as string);

      const error = await getTasks().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toContain('VITE_API_URL');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('posts a new task as JSON and returns the stored task', async () => {
      fetchMock.mockResolvedValue(reply(201, task));

      await expect(createTask({ title: 'Write tests' })).resolves.toEqual(task);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://api.test/tasks');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(init.body).toBe('{"title":"Write tests"}');
    });

    it('reads the health response', async () => {
      const health = { status: 'ok', uptime: 5, timestamp: '2026-01-01T00:00:00.000Z' };
      fetchMock.mockResolvedValue(reply(200, health));

      await expect(getHealth()).resolves.toEqual(health);
    });

    it('sets a timeout signal on every request', async () => {
      fetchMock.mockResolvedValue(reply(200, []));

      await getTasks();

      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('errors', () => {
    async function failure(promise: Promise<unknown>): Promise<ApiError> {
      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      return error as ApiError;
    }

    it('joins the list of validation messages from a 400', async () => {
      fetchMock.mockResolvedValue(
        reply(400, { statusCode: 400, message: ['title should not be empty', 'x is bad'] }),
      );

      const error = await failure(createTask({ title: '' }));

      expect(error.message).toBe('title should not be empty. x is bad');
      expect(error.status).toBe(400);
    });

    it('uses a single-string message from a 4xx', async () => {
      fetchMock.mockResolvedValue(reply(413, { message: 'request entity too large' }));

      expect((await failure(getTasks())).message).toBe('request entity too large');
    });

    it.each([
      ['an object', { message: { detail: 'x' } }],
      ['a number', { message: 42 }],
      ['an empty list', { message: [] }],
      ['no message', { error: 'Bad Request' }],
    ])('does not use %s as the error text', async (_name, body) => {
      fetchMock.mockResolvedValue(reply(400, body));

      expect((await failure(getTasks())).message).toBe('Request failed (400)');
    });

    it('keeps only the text items of a mixed message list', async () => {
      fetchMock.mockResolvedValue(reply(400, { message: ['title is bad', { x: 1 }, 7] }));

      expect((await failure(getTasks())).message).toBe('title is bad');
    });

    it('falls back to the status code when the error body is not JSON', async () => {
      fetchMock.mockResolvedValue(reply(404));

      expect((await failure(getTasks())).message).toBe('Request failed (404)');
    });

    it('explains a 429 as a rate limit', async () => {
      fetchMock.mockResolvedValue(reply(429, { message: 'ThrottlerException' }));

      const error = await failure(createTask({ title: 'x' }));

      expect(error.message).toBe('Too many requests. Please try again in a minute.');
      expect(error.status).toBe(429);
    });

    it('hides server details behind a generic message for a 5xx', async () => {
      fetchMock.mockResolvedValue(reply(500, { message: 'relation "tasks" does not exist' }));

      const error = await failure(getTasks());

      expect(error.message).toBe('The server had a problem. Please try again.');
      expect(error.message).not.toContain('relation');
    });

    it('treats a 503 from /health as an error', async () => {
      fetchMock.mockResolvedValue(reply(503, { status: 'error' }));

      expect((await failure(getHealth())).status).toBe(503);
    });

    it('reports a network failure without a status', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      const error = await failure(getTasks());

      expect(error.message).toBe('Cannot reach the server. Check your connection and try again.');
      expect(error.status).toBeUndefined();
    });

    it('reports a successful response that is not JSON', async () => {
      fetchMock.mockResolvedValue(reply(200));

      expect((await failure(getTasks())).message).toBe('The server sent an unexpected response.');
    });
  });
});
