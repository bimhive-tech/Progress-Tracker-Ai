import pg from 'pg';
import { config } from './config.js';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates shifted by timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// BIGINT (file sizes, counts) comfortably fits in a JS number for our use.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to your environment (Railway → Variables) or a local .env file.');
}

const schema = config.databaseSchema;
if (schema && !/^[a-z_][a-z0-9_]*$/i.test(schema)) {
  throw new Error(`DATABASE_SCHEMA "${schema}" is not a valid identifier.`);
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  options: schema ? `-c search_path=${schema}` : undefined,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
