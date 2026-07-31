/**
 * Applies checked-in SQL migrations against DATABASE_URL.
 * Usage: pnpm --filter @card-battle/server db:migrate
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
);

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];

  if (connectionString === undefined || connectionString === '') {
    console.error('DATABASE_URL is required to run migrations.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const already = await client.query<{ filename: string }>(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [filename],
      );

      if ((already.rowCount ?? 0) > 0) {
        console.log(`skip ${filename}`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, filename), 'utf8');
      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`applied ${filename}`);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
