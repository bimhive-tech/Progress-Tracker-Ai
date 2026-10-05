import fs from 'node:fs';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import express, { type RequestHandler } from 'express';
import compression from 'compression';
import { config } from './config.js';
import { pool } from './db.js';
import { runMigrations } from './migrations.js';
import { errorHandler, noStore } from './http.js';
import { projectsRouter } from './routes/projects.js';
import { checklistRouter } from './routes/checklist.js';
import { activityRouter } from './routes/activity.js';
import { templatesRouter } from './routes/templates.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(compression());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Optional shared-password gate (only active when BASIC_AUTH_PASSWORD is set). */
const basicAuth: RequestHandler = (req, res, next) => {
  if (!config.basicAuthPassword) return next();
  const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator > -1 && safeEqual(user, config.basicAuthUser) && safeEqual(password, config.basicAuthPassword)) {
      return next();
    }
  }
  res.set('WWW-Authenticate', `Basic realm="${config.appName}", charset="UTF-8"`);
  res.status(401).send('Authentication required');
};
app.use(basicAuth);

const api = express.Router();
api.use(express.json({ limit: '1mb' }));
api.use(noStore);
api.get('/config', (_req, res) => {
  res.json({ appName: config.appName });
});
api.use(projectsRouter);
api.use(checklistRouter);
api.use(activityRouter);
api.use(templatesRouter);
api.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
api.use(errorHandler);
app.use('/api', api);

// Serve the built front end (in development Vite serves it instead).
const clientDir = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDir)) {
  app.use(
    express.static(clientDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.use(errorHandler);

async function start() {
  await runMigrations();

  const server = app.listen(config.port, () => {
    console.log(`[server] ${config.appName} tracker listening on port ${config.port}`);
  });

  const shutdown = () => {
    console.log('[server] shutting down');
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
