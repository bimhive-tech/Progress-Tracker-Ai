import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a route param as a UUID, so malformed ids become 404s instead of SQL errors. */
export function uuidParam(value: unknown, what = 'Resource'): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw notFound(what);
  return value;
}

/** Optional free-text field: trims, and turns empty strings into null. */
export const optText = (max: number) =>
  z
    .preprocess(
      (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v),
      z.string().max(max).nullable(),
    )
    .optional();

/** Optional calendar date in YYYY-MM-DD form (empty → null). */
export const optDate = () =>
  z
    .preprocess(
      (v) => (v === '' ? null : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date like 2026-01-31')
        .nullable(),
    )
    .optional();

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    const where = first?.path?.length ? `${first.path.join('.')}: ` : '';
    res.status(400).json({ error: `${where}${first?.message ?? 'Invalid request'}` });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  console.error('[api] unhandled error', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Something went wrong on the server' });
};

export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
