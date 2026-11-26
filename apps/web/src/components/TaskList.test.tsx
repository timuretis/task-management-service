import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Task } from '../api/types';
import { TaskList } from './TaskList';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    title: 'Write tests',
    status: 'todo',
    createdAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

function renderList(props: Partial<React.ComponentProps<typeof TaskList>> = {}) {
  const onRetry = vi.fn();
  render(<TaskList tasks={[]} isLoading={false} error={null} onRetry={onRetry} {...props} />);
  return { onRetry };
}

describe('TaskList', () => {
  describe('states', () => {
    it('says it is loading', () => {
      renderList({ isLoading: true });

      expect(screen.getByRole('status')).toHaveTextContent('Loading tasks…');
      expect(screen.queryByText(/No tasks yet/)).not.toBeInTheDocument();
    });

    it('says there are no tasks yet', () => {
      renderList();

      expect(screen.getByText('No tasks yet. Add your first task above.')).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows the error with a Retry button that calls onRetry', async () => {
      const { onRetry } = renderList({ error: 'Cannot reach the server.' });

      expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server.');
      expect(screen.queryByText(/No tasks yet/)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('still shows tasks created while loading or after a failed load', () => {
      renderList({ tasks: [task()], isLoading: true, error: 'Cannot reach the server.' });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Write tests' })).toBeInTheDocument();
    });
  });

  describe('tasks', () => {
    it('lists tasks in the order given, with status and creation time', () => {
      renderList({
        tasks: [
          task({ id: '2', title: 'Second', status: 'done' }),
          task({ id: '1', title: 'First', status: 'in_progress' }),
        ],
      });

      const items = screen.getAllByRole('listitem');
      expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
        'Second',
        'First',
      ]);
      expect(within(items[0]).getByText('Done')).toBeInTheDocument();
      expect(within(items[1]).getByText('In progress')).toBeInTheDocument();
      expect(within(items[0]).getByText(/2026/)).toHaveAttribute(
        'datetime',
        '2026-01-02T03:04:05.000Z',
      );
    });

    it('shows the description only when the task has one', () => {
      renderList({
        tasks: [
          task({ id: '1', title: 'With', description: 'More detail' }),
          task({ id: '2', title: 'Without' }),
        ],
      });

      const [withDescription, without] = screen.getAllByRole('listitem');
      expect(within(withDescription).getByText('More detail')).toBeInTheDocument();
      expect(within(without).queryByText('More detail')).not.toBeInTheDocument();
      expect(within(without).getAllByText(/./)).toHaveLength(3); // title, status, time
    });

    it('shows markup in a title as plain text, never as HTML', () => {
      const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
      const { container } = render(
        <TaskList
          tasks={[task({ title: evil, description: evil })]}
          isLoading={false}
          error={null}
          onRetry={vi.fn()}
        />,
      );

      expect(screen.getByRole('heading')).toHaveTextContent(evil);
      expect(container.querySelector('img, script')).toBeNull();
    });
  });
});
