/**
 * Table corner chrome — L43-05 / technical spec v6 §6.1.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

function source(name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

describe('table corner chrome (L43-05)', () => {
  it('keeps the dock as Draw + Shop (Stats when finished)', () => {
    const economy = source('economy-bar.tsx');
    expect(economy).toContain('DRAW_ACTION_LABEL');
    expect(economy).toContain('SHOP_ACTION_LABEL');
    expect(economy).toContain('onShowStats');
    expect(economy).not.toContain('How to play');
    expect(economy).not.toContain('onLeave');
    expect(economy).not.toContain('onOpenHowToPlay');
  });

  it('opens a confirm on the first flag click instead of leaving', () => {
    const table = readFileSync(join(dir, '../table.tsx'), 'utf8');
    expect(table).toContain('setLeaveConfirm(flagIntent)');
    expect(table).toContain('HOW_TO_PLAY_ARIA_LABEL');
    expect(table).toContain('RETURN_HOME_ARIA_LABEL');
    expect(table).toContain('TableLeaveConfirm');
    expect(table).toContain('onForfeit()');
    expect(table).not.toMatch(/onClick=\{\(\) => \{\s*onLeave\(\);/);
  });
});
