import type { Task } from '../api/types';
import { TaskItem } from './TaskItem';
import styles from './TaskList.module.css';

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// The list of tasks, with a visible message for loading, failure (with Retry) and "nothing yet".
export function TaskList({ tasks, isLoading, error, onRetry }: TaskListProps) {
  const isEmpty = !isLoading && !error && tasks.length === 0;

  return (
    <section aria-label="Tasks">
      {isLoading && <p role="status">Loading tasks…</p>}
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {isEmpty && <p>No tasks yet. Add your first task above.</p>}
      {/* Tasks created while the list was loading or failing are still shown. */}
      {tasks.length > 0 && (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}
