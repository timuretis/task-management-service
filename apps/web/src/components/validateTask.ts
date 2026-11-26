import type { NewTask } from '../api/types';

// Same limits as the API's CreateTaskDto. The server still checks everything again.
export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 2000;

export interface TaskFormErrors {
  title?: string;
  description?: string;
}

/** Trimmed first, like the API does, so a title of only spaces counts as empty. */
export function validateTask(title: string, description: string): TaskFormErrors {
  const errors: TaskFormErrors = {};
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) errors.title = 'Title is required.';
  else if (trimmedTitle.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  }
  if (description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  return errors;
}

/** What is sent to the API: trimmed text, and no description at all when it is blank. */
export function buildNewTask(title: string, description: string): NewTask {
  const trimmedDescription = description.trim();
  return trimmedDescription
    ? { title: title.trim(), description: trimmedDescription }
    : { title: title.trim() };
}
