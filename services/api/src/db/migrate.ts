import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Migrate] Starting database migrations...');

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Read all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // 3. Query applied migrations
    const { rows: appliedRows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const appliedFiles = new Set(appliedRows.map(r => r.filename));

    // 4. Apply unapplied migrations
    for (const file of files) {
      if (!appliedFiles.has(file)) {
        console.log(`[Migrate] Applying: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`[Migrate] Applied successfully: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[Migrate] Failed to apply ${file}:`, (err as Error).message);
          throw err;
        }
      } else {
        console.log(`[Migrate] Skipping (already applied): ${file}`);
      }
    }

    console.log('[Migrate] All migrations completed successfully.');
  } finally {
    client.release();
  }
}

// Execute directly if run from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrate] Fatal migration error:', err);
      process.exit(1);
    });
}
