import { HealthBadge } from './components/HealthBadge';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { useHealth } from './hooks/useHealth';
import { useTasks } from './hooks/useTasks';
import styles from './App.module.css';

// The whole page: API health badge, the form for a new task and the list of tasks.
export function App() {
  const health = useHealth();
  const { tasks, isLoading, error, reload, createTask } = useTasks();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Task Management</h1>
        {/* The API counts as online when /health answered; no data means it failed or is still unknown. */}
        <HealthBadge isLoading={health.isLoading} isOnline={health.data !== null} />
      </header>
      <div>
        <h2>New task</h2>
        <TaskForm onCreate={createTask} />
      </div>
      <div>
        <h2>Tasks</h2>
        <TaskList tasks={tasks} isLoading={isLoading} error={error} onRetry={reload} />
      </div>
    </main>
  );
}
