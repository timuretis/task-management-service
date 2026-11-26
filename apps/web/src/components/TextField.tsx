import type { ChangeEvent } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  /** Renders a multi-line box instead of a single line. */
  multiline?: boolean;
  onChange: (value: string) => void;
}

// One labelled input with its error message underneath, wired for screen readers.
export function TextField({ id, label, value, error, multiline, onChange }: TextFieldProps) {
  const errorId = `${id}-error`;
  const shared = {
    id,
    value,
    'aria-invalid': Boolean(error),
    // Links the input to its error text, so the message is read out with the field.
    'aria-describedby': error ? errorId : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };

  return (
    <>
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={3} {...shared} /> : <input {...shared} />}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}
