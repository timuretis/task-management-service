import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import type { NewTask } from '../api/types';
import styles from './TaskForm.module.css';
import { TextField } from './TextField';
import { buildNewTask, validateTask, type TaskFormErrors } from './validateTask';

interface TaskFormProps {
  /** Rejects with an ApiError when the server refuses the task. */
  onCreate: (task: NewTask) => Promise<void>;
}

// Form for a new task: checks the input in the browser, then shows any server error under the form.
export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateTask(title, description);
    setErrors(found);
    if (found.title || found.description) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onCreate(buildNewTask(title, description));
      setTitle('');
      setDescription('');
    } catch (e) {
      // The typed text stays in the fields so the person can fix it and try again.
      setSubmitError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        id="task-title"
        label="Title"
        value={title}
        error={errors.title}
        onChange={(value) => {
          setTitle(value);
          setErrors((current) => ({ ...current, title: undefined }));
        }}
      />
      <TextField
        id="task-description"
        label="Description (optional)"
        value={description}
        error={errors.description}
        multiline
        onChange={(value) => {
          setDescription(value);
          setErrors((current) => ({ ...current, description: undefined }));
        }}
      />
      {submitError && (
        <p role="alert" className={styles.error}>
          {submitError}
        </p>
      )}
      {/* While sending, a disabled submit button also stops the Enter key from submitting again. */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}
