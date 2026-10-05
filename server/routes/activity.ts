import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { notFound, optText, uuidParam } from '../http.js';

export const activityRouter = Router();

const entryFields = {
  type: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().min(1, 'Title is required').max(300),
  details: optText(5000),
  author: optText(120),
  occurred_at: z.iso.datetime({ offset: true }).optional(),
};

const createSchema = z.object(entryFields);
const updateSchema = z.object({ ...entryFields, title: entryFields.title.optional() });

activityRouter.get('/activity', async (req, res) => {
  const params = z
    .object({
      limit: z.coerce.number().int().min(1).max(500).default(30),
      project_id: z.uuid().optional(),
      before: z.iso.datetime({ offset: true }).optional(),
    })
    .parse(req.query);

  const where: string[] = [];
  const values: unknown[] = [];
  if (params.project_id) {
    values.push(params.project_id);
    where.push(`a.project_id = $${values.length}`);
  }
  if (params.before) {
    values.push(params.before);
    where.push(`a.occurred_at < $${values.length}`);
  }
  values.push(params.limit);

  const rows = await query(
    `SELECT a.*, p.name AS project_name, p.archived AS project_archived
     FROM activity_entries a
     JOIN projects p ON p.id = a.project_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY a.occurred_at DESC, a.created_at DESC
     LIMIT $${values.length}`,
    values,
  );
  res.json(rows);
});

activityRouter.post('/projects/:id/activity', async (req, res) => {
  const projectId = uuidParam(req.params.id, 'Project');
  const body = createSchema.parse(req.body);
  const project = await queryOne('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (!project) throw notFound('Project');

  const entry = await queryOne(
    `INSERT INTO activity_entries (project_id, type, title, details, author, occurred_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
     RETURNING *`,
    [projectId, body.type ?? 'note', body.title, body.details ?? null, body.author ?? null, body.occurred_at ?? null],
  );
  await query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
  res.status(201).json(entry);
});

activityRouter.patch('/activity/:entryId', async (req, res) => {
  const entryId = uuidParam(req.params.entryId, 'Activity entry');
  const body = updateSchema.parse(req.body);

  const entry = await queryOne(
    `UPDATE activity_entries SET
       type = COALESCE($2, type),
       title = COALESCE($3, title),
       details = CASE WHEN $4::boolean THEN $5 ELSE details END,
       author = CASE WHEN $6::boolean THEN $7 ELSE author END,
       occurred_at = COALESCE($8::timestamptz, occurred_at)
     WHERE id = $1
     RETURNING *`,
    [
      entryId,
      body.type ?? null,
      body.title ?? null,
      'details' in body,
      body.details ?? null,
      'author' in body,
      body.author ?? null,
      body.occurred_at ?? null,
    ],
  );
  if (!entry) throw notFound('Activity entry');
  res.json(entry);
});

activityRouter.delete('/activity/:entryId', async (req, res) => {
  const entryId = uuidParam(req.params.entryId, 'Activity entry');
  const deleted = await queryOne('DELETE FROM activity_entries WHERE id = $1 RETURNING id', [entryId]);
  if (!deleted) throw notFound('Activity entry');
  res.status(204).end();
});
