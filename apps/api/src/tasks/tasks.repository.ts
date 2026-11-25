import { NewTask, Task } from './task';

/**
 * Data access for tasks. It is an abstract class (not an interface) so Nest can use it
 * as an injection token; phase 2 adds a Postgres implementation without touching the service.
 */
export abstract class TasksRepository {
  abstract create(newTask: NewTask): Promise<Task>;
  /** Newest first, at most `limit` tasks. */
  abstract findRecent(limit: number): Promise<Task[]>;
}
