import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import { HttpError, notFound, optDate, optText, uuidParam } from '../http.js';
import { PROJECT_STATUSES, refreshProject, writeStatus } from '../status.js';

export const projectsRouter = Router();

/** Projects plus the aggregates the dashboard needs (progress, counts, current stage). */
export const PROJECT_SELECT = `
  SELECT p.*,
    COALESCE(c.total, 0)::int    AS items_total,
    COALESCE(c.done, 0)::int     AS items_done,
    COALESCE(c.progress, 0)::int AS progress,
    cs.title AS current_stage,
    a.last_activity_at
  FROM projects p
  LEFT JOIN LATERAL (
    SELECT count(*) AS total,
           count(*) FILTER (WHERE state = 'done') AS done,
           round(avg(CASE state WHEN 'done' THEN 100 WHEN 'in_progress' THEN progress ELSE 0 END)) AS progress
    FROM checklist_items WHERE project_id = p.id
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT title FROM checklist_items WHERE project_id = p.id AND state <> 'done'
    ORDER BY (state = 'in_progress') DESC, position ASC LIMIT 1
  ) cs ON true
  LEFT JOIN LATERAL (
    SELECT max(occurred_at) AS last_activity_at FROM activity_entries WHERE project_id = p.id
  ) a ON true
`;

const customFields = z
  .array(z.object({ label: z.string().trim().max(100), value: z.string().trim().max(2000) }))
  .max(50)
  .transform((fields) => fields.filter((f) => f.label || f.value));

const projectFields = {
  name: z.string().trim().min(1, 'Project name is required').max(200),
  code: optText(60),
  client: optText(200),
  location: optText(300),
  category: optText(100),
  description: optText(5000),
  lead: optText(120),
  start_date: optDate(),
  due_date: optDate(),
  area: optText(60),
  levels: optText(120),
  output_types: optText(200),
  software: optText(200),
  custom_fields: customFields.optional(),
};

const createSchema = z.object({
  ...projectFields,
  template_id: z.uuid().nullable().optional(),
});

const updateSchema = z
  .object({
    ...projectFields,
    name: projectFields.name.optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    status_mode: z.enum(['auto', 'manual']).optional(),
    archived: z.boolean().optional(),
  });

const EDITABLE_COLUMNS = [
  'name',
  'code',
  'client',
  'location',
  'category',
  'description',
  'lead',
  'start_date',
  'due_date',
  'area',
  'levels',
  'output_types',
  'software',
  'custom_fields',
  'archived',
] as const;

export async function loadProject(id: string) {
  const project = await queryOne(`${PROJECT_SELECT} WHERE p.id = $1`, [id]);
  if (!project) throw notFound('Project');
  return project;
}

projectsRouter.get('/projects', async (_req, res) => {
  const projects = await query(`${PROJECT_SELECT} ORDER BY p.updated_at DESC`);
  res.json(projects);
});

projectsRouter.post('/projects', async (req, res) => {
  const body = createSchema.parse(req.body);

  const id = await transaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO projects (name, code, client, location, category, description, lead, start_date, due_date,
                             area, levels, output_types, software, custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
       RETURNING id`,
      [
        body.name,
        body.code ?? null,
        body.client ?? null,
        body.location ?? null,
        body.category ?? null,
        body.description ?? null,
        body.lead ?? null,
        body.start_date ?? null,
        body.due_date ?? null,
        body.area ?? null,
        body.levels ?? null,
        body.output_types ?? null,
        body.software ?? null,
        JSON.stringify(body.custom_fields ?? []),
      ],
    );
    const projectId = rows[0]!.id;

    if (body.template_id) {
      const template = await db.query<{ items: { title: string; note?: string; icon?: string }[] }>(
        'SELECT items FROM templates WHERE id = $1',
        [body.template_id],
      );
      if (!template.rows[0]) throw new HttpError(400, 'Template not found');
      await insertTemplateItems(db, projectId, template.rows[0].items, 0);
    }
    return projectId;
  });

  res.status(201).json(await loadProject(id));
});

export async function insertTemplateItems(
  db: { query: (text: string, params: unknown[]) => Promise<unknown> },
  projectId: string,
  items: { title: string; note?: string | null; icon?: string | null }[],
  startPosition: number,
) {
  let position = startPosition;
  for (const item of items) {
    if (!item?.title?.trim()) continue;
    await db.query('INSERT INTO checklist_items (project_id, title, note, icon, position) VALUES ($1, $2, $3, $4, $5)', [
      projectId,
      item.title.trim(),
      item.note?.trim() || null,
      item.icon || null,
      position++,
    ]);
  }
}

projectsRouter.get('/projects/:id', async (req, res) => {
  const id = uuidParam(req.params.id, 'Project');
  const project = await loadProject(id);
  const [items, activity] = await Promise.all([
    query('SELECT * FROM checklist_items WHERE project_id = $1 ORDER BY position ASC, created_at ASC', [id]),
    query('SELECT * FROM activity_entries WHERE project_id = $1 ORDER BY occurred_at DESC, created_at DESC', [id]),
  ]);
  res.json({ project, items, activity });
});

projectsRouter.patch('/projects/:id', async (req, res) => {
  const id = uuidParam(req.params.id, 'Project');
  const body = updateSchema.parse(req.body);

  await transaction(async (db) => {
    const existing = await db.query('SELECT id FROM projects WHERE id = $1 FOR UPDATE', [id]);
    if (!existing.rows[0]) throw notFound('Project');

    const sets: string[] = [];
    const params: unknown[] = [id];
    for (const column of EDITABLE_COLUMNS) {
      if (!(column in body)) continue;
      const value = body[column as keyof typeof body];
      params.push(column === 'custom_fields' ? JSON.stringify(value ?? []) : (value ?? null));
      sets.push(`${column} = $${params.length}${column === 'custom_fields' ? '::jsonb' : ''}`);
    }
    if (sets.length) {
      await db.query(`UPDATE projects SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, params);
    }

    if (body.status_mode === 'auto') {
      await db.query("UPDATE projects SET status_mode = 'auto' WHERE id = $1", [id]);
      await refreshProject(id, db);
    } else if (body.status) {
      await db.query("UPDATE projects SET status_mode = 'manual' WHERE id = $1", [id]);
      await writeStatus(db, id, body.status);
    } else if (body.status_mode === 'manual') {
      await db.query("UPDATE projects SET status_mode = 'manual', updated_at = now() WHERE id = $1", [id]);
    }
  });

  res.json(await loadProject(id));
});

projectsRouter.delete('/projects/:id', async (req, res) => {
  const id = uuidParam(req.params.id, 'Project');
  const deleted = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
  if (!deleted.length) throw notFound('Project');
  res.status(204).end();
});
