import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { ApiError, createTask, getHealth, getTasks } from './api/client';
import type { Task } from './api/types';

vi.mock('./api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/client')>()),
  getHealth: vi.fn(),
  getTasks: vi.fn(),
  createTask: vi.fn(),
}));

const health = { status: 'ok' as const, uptime: 1, timestamp: '2026-01-01T00:00:00.000Z' };

function task(id: string, title: string): Task {
  return { id, title, status: 'todo', createdAt: '2026-01-02T03:04:05.000Z' };
}

function titlesInList(): string[] {
  return screen
    .getAllByRole('listitem')
    .map((li) => within(li).getByRole('heading').textContent ?? '');
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(getHealth).mockReset().mockResolvedValue(health);
    vi.mocked(getTasks).mockReset().mockResolvedValue([]);
    vi.mocked(createTask).mockReset();
  });

  it('shows the page structure, with loading messages first', () => {
    vi.mocked(getHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(getTasks).mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Task Management' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New task' })).toBeInTheDocument();
    expect(screen.getByText('Checking API…')).toBeInTheDocument();
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
  });

  it('shows the API online and the empty state when there are no tasks', async () => {
    render(<App />);

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(await screen.findByText(/No tasks yet/)).toBeInTheDocument();
  });

  it('lists the tasks the API returns', async () => {
    vi.mocked(getTasks).mockResolvedValue([task('2', 'Second'), task('1', 'First')]);

    render(<App />);
    await screen.findAllByRole('listitem');

    expect(titlesInList()).toEqual(['Second', 'First']);
  });

  it('adds a task from the form to the top of the list', async () => {
    vi.mocked(getTasks).mockResolvedValue([task('1', 'Old')]);
    vi.mocked(createTask).mockResolvedValue(task('2', 'Buy milk'));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Old');

    await user.type(screen.getByLabelText('Title'), 'Buy milk');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(createTask).toHaveBeenCalledWith({ title: 'Buy milk' });
    await screen.findByText('Buy milk');
    expect(titlesInList()).toEqual(['Buy milk', 'Old']);
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('shows offline and a retryable list error when the API is down, then recovers', async () => {
    vi.mocked(getHealth).mockRejectedValue(new ApiError('down'));
    vi.mocked(getTasks).mockRejectedValueOnce(new ApiError('Cannot reach the server.'));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');

    vi.mocked(getTasks).mockResolvedValueOnce([task('1', 'Back again')]);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Back again')).toBeInTheDocument();
    expect(screen.queryByText('Cannot reach the server.')).not.toBeInTheDocument();
  });

  it('keeps the form text and shows the message when the API refuses a task', async () => {
    vi.mocked(createTask).mockRejectedValue(
      new ApiError('Too many requests. Please try again in a minute.', 429),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/No tasks yet/);

    await user.type(screen.getByLabelText('Title'), 'Buy milk');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');
    expect(screen.getByLabelText('Title')).toHaveValue('Buy milk');
  });
});
