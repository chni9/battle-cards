/**
 * Call-site import guard — L32-02.
 * Production drivers must resolve policies via the registry, not free functions.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

const FORBIDDEN_IMPORT = /from ['"][^'"]*(heuristic-policy|sub-choice-picks)['"]/;

const CALL_SITES = [
  'bots/bot-driver.ts',
  'rooms/game-room.ts',
  'simulation/run-game.ts',
] as const;

describe('L32-02 call-site imports', () => {
  it('does not import heuristic-policy or sub-choice-picks from room/sim/driver', () => {
    for (const relative of CALL_SITES) {
      const source = readFileSync(join(ROOT, relative), 'utf8');
      expect(source, relative).not.toMatch(FORBIDDEN_IMPORT);
    }
  });
});
