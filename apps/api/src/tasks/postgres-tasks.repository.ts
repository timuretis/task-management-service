import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { DATABASE_POOL } from '../database/database.constants';
import { NewTask, Task, TaskStatus } from './task';
import { TasksRepository } from './tasks.repository';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: Date;
}

const COLUMNS = 'id, title, description, status, created_at';

// Values only ever travel as $n parameters, never inside the SQL text.
const INSERT_TASK = `INSERT INTO tasks (id, title, description) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`;
// Same ordering as the index tasks_created_at_id_idx, so Postgres reads it without sorting (D19).
const SELECT_RECENT = `SELECT ${COLUMNS} FROM tasks ORDER BY created_at DESC, id DESC LIMIT $1`;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    // The API omits an absent description instead of returning null.
    ...(row.description !== null && { description: row.description }),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

@Injectable()
export class PostgresTasksRepository extends TasksRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  async create(newTask: NewTask): Promise<Task> {
    // The id is made here, not by the database (D18); status and created_at use column defaults.
    const params = [uuidv7(), newTask.title, newTask.description ?? null];
    const result = await this.pool.query<TaskRow>(INSERT_TASK, params);
    return toTask(result.rows[0]);
  }

  async findRecent(limit: number): Promise<Task[]> {
    const result = await this.pool.query<TaskRow>(SELECT_RECENT, [limit]);
    return result.rows.map(toTask);
  }
}
