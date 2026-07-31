/**
 * Lazy Postgres pool for the finished-game log (technical spec §3).
 * Missing DATABASE_URL → null pool; callers soft-skip.
 */

import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null | undefined;

export function getPool(): pg.Pool | null {
  if (pool !== undefined) {
    return pool;
  }

  const connectionString = process.env['DATABASE_URL'];

  if (connectionString === undefined || connectionString === '') {
    pool = null;
    return null;
  }

  pool = new Pool({ connectionString });
  pool.on('error', (error: Error) => {
    console.error('[db] unexpected idle client error', error);
  });

  return pool;
}

/** Test-only: reset the cached pool between cases. */
export function resetPoolForTests(): void {
  pool = undefined;
}
