/**
 * Tutorial completion must not skip first-game hints — L46-03 / spec §5.2.
 * Home part, split from help/tutorial-hints-independence.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const clientSrc = join(here, '..');

function read(rel: string): string {
  return readFileSync(join(clientSrc, rel), 'utf8');
}

describe('tutorial does not skip first-game hints (L46-03)', () => {
  it('startTutorialGame, Game over, and Skip tutorial never write skipAll (home)', () => {
    const home = read('screens/home.tsx');

    expect(home).not.toContain('skipAllHints');
  });
});
