import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { notFound, optText, uuidParam } from '../http.js';

export const templatesRouter = Router();

const templateItems = z
  .array(
    z.object({
      title: z.string().trim().max(200),
      note: z.string().trim().max(1000).nullable().optional(),
      icon: z.string().trim().max(40).nullable().optional(),
    }),
  )
  .max(200)
  .transform((items) =>
    items.filter((i) => i.title).map((i) => ({ title: i.title, note: i.note || '', icon: i.icon || null })),
  );

const createSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(200),
  description: optText(2000),
  items: templateItems.default([]),
});
const updateSchema = z.object({
  name: createSchema.shape.name.optional(),
  description: optText(2000),
  items: templateItems.optional(),
});

templatesRouter.get('/templates', async (_req, res) => {
  res.json(await query('SELECT * FROM templates ORDER BY created_at ASC'));
});

templatesRouter.post('/templates', async (req, res) => {
  const body = createSchema.parse(req.body);
  const template = await queryOne(
    'INSERT INTO templates (name, description, items) VALUES ($1, $2, $3::jsonb) RETURNING *',
    [body.name, body.description ?? null, JSON.stringify(body.items)],
  );
  res.status(201).json(template);
});

templatesRouter.patch('/templates/:id', async (req, res) => {
  const id = uuidParam(req.params.id, 'Template');
  const body = updateSchema.parse(req.body);
  const template = await queryOne(
    `UPDATE templates SET
       name = COALESCE($2, name),
       description = CASE WHEN $3::boolean THEN $4 ELSE description END,
       items = COALESCE($5::jsonb, items),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, body.name ?? null, 'description' in body, body.description ?? null, body.items ? JSON.stringify(body.items) : null],
  );
  if (!template) throw notFound('Template');
  res.json(template);
});

templatesRouter.delete('/templates/:id', async (req, res) => {
  const id = uuidParam(req.params.id, 'Template');
  const deleted = await queryOne('DELETE FROM templates WHERE id = $1 RETURNING id', [id]);
  if (!deleted) throw notFound('Template');
  res.status(204).end();
});
