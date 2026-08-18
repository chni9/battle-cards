/**
 * Published-screen replay helper — L38-03.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runScreen } from './run-screen';
import { parseScreenArgs } from './screen-config';
import { verifyPublishedScreen } from './verify-screen-determinism';

describe('verifyPublishedScreen (L38-03)', () => {
  it('replays a tiny heuristic screen byte-for-byte', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-screen-ver-'));

    try {
      await runScreen(
        parseScreenArgs([
          '--kits',
          'assassin,kamikaze',
          '--games-per-cell',
          '1',
          '--seed',
          'l38-verify',
          '--out',
          dir,
          '--four-player-mode',
          'fixed',
          '--four-player-mix',
          'untouchable,kamikaze,scientific,assassin',
          '--four-player-games',
          '1',
          '--policy',
          'heuristic-v4',
          '--search-iterations',
          '1',
          '--concurrency',
          '1',
        ]),
        { quiet: true },
      );

      await expect(verifyPublishedScreen(dir)).resolves.toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
