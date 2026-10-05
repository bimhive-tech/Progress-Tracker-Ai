import type pg from 'pg';
import { pool } from './db.js';

export const PROJECT_STATUSES = ['not_started', 'processing', 'in_review', 'on_hold', 'completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const CHECKLIST_STATES = ['pending', 'in_progress', 'done'] as const;
export type ChecklistState = (typeof CHECKLIST_STATES)[number];

type Db = pg.Pool | pg.PoolClient;

/**
 * Automatic status rules:
 *  - no checklist, or nothing started yet → Not started
 *  - every item done                      → Completed
 *  - anything done or in progress         → Processing
 * "In review" and "On hold" are only ever set manually.
 */
export function computeAutoStatus(states: ChecklistState[]): ProjectStatus {
  if (states.length === 0) return 'not_started';
  if (states.every((s) => s === 'done')) return 'completed';
  if (states.some((s) => s !== 'pending')) return 'processing';
  return 'not_started';
}

/** Writes a status, keeping status_changed_at / completed_at accurate. Also bumps updated_at. */
export async function writeStatus(db: Db, projectId: string, status: ProjectStatus): Promise<void> {
  await db.query(
    `UPDATE projects SET
       status = $2::text,
       status_changed_at = CASE WHEN status IS DISTINCT FROM $2::text THEN now() ELSE status_changed_at END,
       completed_at = CASE
         WHEN $2::text = 'completed' THEN COALESCE(CASE WHEN status = 'completed' THEN completed_at END, now())
         ELSE NULL
       END,
       updated_at = now()
     WHERE id = $1`,
    [projectId, status],
  );
}

/** Re-derives the status from the checklist when the project is in automatic mode; otherwise just touches updated_at. */
export async function refreshProject(projectId: string, db: Db = pool): Promise<void> {
  const { rows } = await db.query<{ status_mode: string }>('SELECT status_mode FROM projects WHERE id = $1', [projectId]);
  const project = rows[0];
  if (!project) return;
  if (project.status_mode !== 'auto') {
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
    return;
  }
  const items = await db.query<{ state: ChecklistState }>('SELECT state FROM checklist_items WHERE project_id = $1', [
    projectId,
  ]);
  await writeStatus(
    db,
    projectId,
    computeAutoStatus(items.rows.map((r) => r.state)),
  );
}
