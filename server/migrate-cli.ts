import { runMigrations } from './migrations.js';
import { pool } from './db.js';

runMigrations()
  .then(() => console.log('[db] migrations up to date'))
  .catch((err) => {
    console.error('[db] migration failed', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
