/**
 * Tutorial completion must not skip first-game hints — L46-03 / spec §5.2.
 * Table part, split from help/tutorial-hints-independence.test.ts by owner lot (technical spec v7 §12.1, L72-02).
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
  it('startTutorialGame, Game over, and Skip tutorial never write skipAll (table)', () => {
    const leave = read('screens/table/table-leave-confirm.tsx');
    const table = read('screens/table.tsx');

    expect(leave).not.toContain('skipAllHints');
    expect(leave).not.toContain('help-storage');
    expect(table).toContain("if (view.playKind === 'tutorial')");
    expect(table).toContain('applyHintPatch');
    expect(table).toMatch(
      /onSkipAll=\{\(\) => \{\s*setHintState\(\(prev\) => applyHintPatch\(prev, \{ skipAll: true \}\)\);/,
    );
    expect(table).toMatch(/onConfirm=\{\(\) => \{[\s\S]*onLeave\(\);[\s\S]*\}\}/);
    expect(table).not.toMatch(/onConfirm=\{\(\) => \{[\s\S]*skipAllHints/);
  });
});
