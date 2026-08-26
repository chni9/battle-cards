/**
 * Tutorial completion must not skip first-game hints — L46-03 / spec §5.2.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EMPTY_HINT_STATE, resetHelpStorage } from './help-storage';
import { selectHint } from './select-hint';

const here = dirname(fileURLToPath(import.meta.url));
const clientSrc = join(here, '..');

function read(rel: string): string {
  return readFileSync(join(clientSrc, rel), 'utf8');
}

describe('tutorial does not skip first-game hints (L46-03)', () => {
  it('startTutorialGame, Game over, and Skip tutorial never write skipAll', () => {
    const launch = read('net/use-room-connection.ts');
    const app = read('App.tsx');
    const gameOver = read('screens/game-over-dialog.tsx');
    const leave = read('screens/table/table-leave-confirm.tsx');
    const home = read('screens/home.tsx');
    const table = read('screens/table.tsx');

    expect(launch).not.toContain('skipAllHints');
    expect(launch).not.toContain('HINTS_STORAGE_KEY');
    expect(app).not.toContain('skipAllHints');
    expect(app).not.toContain('HINTS_STORAGE_KEY');
    expect(gameOver).not.toContain('skipAllHints');
    expect(gameOver).not.toContain('help-storage');
    expect(leave).not.toContain('skipAllHints');
    expect(leave).not.toContain('help-storage');
    expect(home).not.toContain('skipAllHints');
    expect(table).toContain("if (view.playKind === 'tutorial')");
    expect(table).toContain('skipAllHints');
    expect(table).toMatch(/onSkipAll=\{\(\) => \{\s*setHintState\(skipAllHints\(\)\);/);
    expect(table).toMatch(/onConfirm=\{\(\) => \{[\s\S]*onLeave\(\);[\s\S]*\}\}/);
    expect(table).not.toMatch(/onConfirm=\{\(\) => \{[\s\S]*skipAllHints/);
  });

  it('Classic Solo/Online stays eligible after an empty tutorial-complete blob', () => {
    expect(EMPTY_HINT_STATE.skipAll).toBe(false);
    expect(
      selectHint({
        playKind: 'classic',
        readOnly: false,
        selfEliminated: false,
        isMyTurn: true,
        skipAll: false,
        dismissed: [],
        hasRealIncoming: false,
        hasUnspiedLivingOpponent: true,
      }),
    ).toBe('your-turn');
  });

  it('Reset help remains the clear path', () => {
    expect(resetHelpStorage.toString()).toContain('HINTS_STORAGE_KEY');
  });
});
