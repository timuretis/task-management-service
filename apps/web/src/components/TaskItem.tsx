import type { Task, TaskStatus } from '../api/types';
import styles from './TaskItem.module.css';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

// One task in the list: title, optional description, status and creation time.
export function TaskItem({ task }: { task: Task }) {
  const createdAt = new Date(task.createdAt);

  return (
    <li className={styles.item}>
      <div className={styles.header}>
        <h3 className={styles.title}>{task.title}</h3>
        <span className={styles.status}>{STATUS_LABELS[task.status]}</span>
      </div>
      {/* React escapes text, so a title or description can never inject HTML. */}
      {task.description && <p className={styles.description}>{task.description}</p>}
      <time className={styles.time} dateTime={task.createdAt}>
        {createdAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </time>
    </li>
  );
}
