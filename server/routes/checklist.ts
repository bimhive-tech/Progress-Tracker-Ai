import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import { HttpError, notFound, optText, uuidParam } from '../http.js';
import { CHECKLIST_STATES, refreshProject } from '../status.js';
import { insertTemplateItems } from './projects.js';

export const checklistRouter = Router();

const itemFields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  note: optText(1000),
  icon: optText(40),
  state: z.enum(CHECKLIST_STATES).optional(),
  progress: z.number().int().min(0).max(100).optional(),
};

const createSchema = z.object(itemFields);
const updateSchema = z.object({ ...itemFields, title: itemFields.title.optional() });

/** Every project's checklist in one go, for the portfolio overview. */
checklistRouter.get('/checklist', async (_req, res) => {
  res.json(await query('SELECT * FROM checklist_items ORDER BY project_id, position ASC, created_at ASC'));
});

async function ensureProject(id: string) {
  const project = await queryOne('SELECT id FROM projects WHERE id = $1', [id]);
  if (!project) throw notFound('Project');
}

checklistRouter.post('/projects/:id/checklist', async (req, res) => {
  const projectId = uuidParam(req.params.id, 'Project');
  const body = createSchema.parse(req.body);
  await ensureProject(projectId);

  const state = body.state ?? 'pending';
  const progress = state === 'done' ? 100 : state === 'in_progress' ? (body.progress ?? 0) : 0;
  const item = await queryOne(
    `INSERT INTO checklist_items (project_id, title, note, icon, state, progress, completed_at, position)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 = 'done' THEN now() END,
             COALESCE((SELECT max(position) + 1 FROM checklist_items WHERE project_id = $1), 0))
     RETURNING *`,
    [projectId, body.title, body.note ?? null, body.icon ?? null, state, progress],
  );
  await refreshProject(projectId);
  res.status(201).json(item);
});

checklistRouter.post('/projects/:id/checklist/from-template', async (req, res) => {
  const projectId = uuidParam(req.params.id, 'Project');
  const { template_id } = z.object({ template_id: z.uuid() }).parse(req.body);

  await transaction(async (db) => {
    const project = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (!project.rows[0]) throw notFound('Project');
    const template = await db.query('SELECT items FROM templates WHERE id = $1', [template_id]);
    if (!template.rows[0]) throw new HttpError(400, 'Template not found');
    const max = await db.query<{ next: number }>(
      'SELECT COALESCE(max(position) + 1, 0)::int AS next FROM checklist_items WHERE project_id = $1',
      [projectId],
    );
    await insertTemplateItems(db, projectId, template.rows[0].items, max.rows[0]!.next);
    await refreshProject(projectId, db);
  });

  res.json(await query('SELECT * FROM checklist_items WHERE project_id = $1 ORDER BY position ASC', [projectId]));
});

checklistRouter.put('/projects/:id/checklist/order', async (req, res) => {
  const projectId = uuidParam(req.params.id, 'Project');
  const { ids } = z.object({ ids: z.array(z.uuid()).max(500) }).parse(req.body);

  await transaction(async (db) => {
    for (const [index, itemId] of ids.entries()) {
      await db.query('UPDATE checklist_items SET position = $1 WHERE id = $2 AND project_id = $3', [index, itemId, projectId]);
    }
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
  });
  res.status(204).end();
});

checklistRouter.patch('/checklist/:itemId', async (req, res) => {
  const itemId = uuidParam(req.params.itemId, 'Checklist item');
  const body = updateSchema.parse(req.body);

  const existing = await queryOne<{ project_id: string; state: string; progress: number }>(
    'SELECT project_id, state, progress FROM checklist_items WHERE id = $1',
    [itemId],
  );
  if (!existing) throw notFound('Checklist item');

  const state = body.state ?? existing.state;
  let progress = body.progress ?? existing.progress;
  if (state === 'done') progress = 100;
  else if (state === 'pending') progress = 0;
  else if (body.progress === undefined && existing.state === 'done') progress = 0;

  const item = await queryOne(
    `UPDATE checklist_items SET
       title = COALESCE($2, title),
       note = CASE WHEN $3::boolean THEN $4 ELSE note END,
       icon = CASE WHEN $5::boolean THEN $6 ELSE icon END,
       state = $7,
       progress = $8,
       completed_at = CASE WHEN $7 = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END,
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [itemId, body.title ?? null, 'note' in body, body.note ?? null, 'icon' in body, body.icon ?? null, state, progress],
  );
  await refreshProject(existing.project_id);
  res.json(item);
});

checklistRouter.delete('/checklist/:itemId', async (req, res) => {
  const itemId = uuidParam(req.params.itemId, 'Checklist item');
  const deleted = await queryOne<{ project_id: string }>('DELETE FROM checklist_items WHERE id = $1 RETURNING project_id', [
    itemId,
  ]);
  if (!deleted) throw notFound('Checklist item');
  await refreshProject(deleted.project_id);
  res.status(204).end();
});
