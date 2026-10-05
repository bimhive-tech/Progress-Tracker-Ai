import { pool } from './db.js';
import { config } from './config.js';

type Migration = { id: number; name: string; sql: string };

const seedTemplates = [
  {
    name: 'CAD to BIM — Standard',
    description: 'Default Revit modelling workflow, from CAD drawings to exported BIM deliverables.',
    items: [
      { title: 'Files validated', note: 'Drawings received, complete and readable', icon: 'file-check' },
      { title: 'CAD analysed', note: 'Layers, blocks and scales reviewed', icon: 'layers' },
      { title: 'Levels detected', note: 'Floor levels and elevations set up', icon: 'chart' },
      { title: 'Creating walls and rooms', note: '', icon: 'box' },
      { title: 'Placing doors and windows', note: '', icon: 'door' },
      { title: 'Running QA checks', note: 'Clash, naming and parameter checks', icon: 'shield' },
      { title: 'Finalising exports', note: 'RVT, IFC, PDF', icon: 'upload' },
    ],
  },
  {
    name: 'Scan to Model (Blender)',
    description: 'Site capture, processing and Blender clean-up through to client delivery.',
    items: [
      { title: 'Site data gathered', note: 'Photos, scans and measurements collected', icon: 'camera' },
      { title: 'Data processed', note: 'Point cloud / photogrammetry processed', icon: 'cpu' },
      { title: 'Cleaned up in Blender', note: '', icon: 'wrench' },
      { title: 'Model built', note: '', icon: 'box' },
      { title: 'Internal review', note: '', icon: 'eye' },
      { title: 'Delivered to client', note: '', icon: 'send' },
    ],
  },
];

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial schema',
    sql: `
      CREATE TABLE projects (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name              text NOT NULL,
        code              text,
        client            text,
        location          text,
        category          text,
        description       text,
        lead              text,
        start_date        date,
        due_date          date,
        area              text,
        levels            text,
        output_types      text,
        software          text,
        custom_fields     jsonb NOT NULL DEFAULT '[]'::jsonb,
        status            text NOT NULL DEFAULT 'not_started',
        status_mode       text NOT NULL DEFAULT 'auto',
        archived          boolean NOT NULL DEFAULT false,
        status_changed_at timestamptz NOT NULL DEFAULT now(),
        completed_at      timestamptz,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT projects_status_check CHECK (status IN ('not_started','processing','in_review','on_hold','completed')),
        CONSTRAINT projects_status_mode_check CHECK (status_mode IN ('auto','manual'))
      );

      CREATE TABLE checklist_items (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title        text NOT NULL,
        note         text,
        icon         text,
        state        text NOT NULL DEFAULT 'pending',
        progress     integer NOT NULL DEFAULT 0,
        position     integer NOT NULL DEFAULT 0,
        completed_at timestamptz,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT checklist_state_check CHECK (state IN ('pending','in_progress','done')),
        CONSTRAINT checklist_progress_check CHECK (progress BETWEEN 0 AND 100)
      );
      CREATE INDEX checklist_items_project_idx ON checklist_items (project_id, position);

      CREATE TABLE activity_entries (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        type        text NOT NULL DEFAULT 'note',
        title       text NOT NULL,
        details     text,
        author      text,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX activity_entries_project_idx ON activity_entries (project_id, occurred_at DESC);
      CREATE INDEX activity_entries_time_idx ON activity_entries (occurred_at DESC);

      CREATE TABLE templates (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name        text NOT NULL,
        description text,
        items       jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );

      ${seedTemplates
        .map(
          (t) =>
            `INSERT INTO templates (name, description, items) VALUES (${sqlLiteral(t.name)}, ${sqlLiteral(t.description)}, ${sqlLiteral(JSON.stringify(t.items))}::jsonb);`,
        )
        .join('\n')}
    `,
  },
];

const LOCK_KEY = 72_727_001;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    if (config.databaseSchema) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${config.databaseSchema}"`);
    }
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         integer PRIMARY KEY,
        name       text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ id: number }>('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      console.log(`[db] applying migration ${migration.id}: ${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}
