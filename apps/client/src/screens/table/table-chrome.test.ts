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

describe('opponent row (L53-04)', () => {
  it('keeps opponents on one nowrap row without wrapping extra foes', () => {
    const shell = source('table-shell.tsx');
    expect(shell).toContain('flex-nowrap');
    expect(shell.replaceAll('flex-nowrap', '')).not.toMatch(
      /table-felt__opponents[\s\S]{0,280}flex-wrap/,
    );
    const css = readFileSync(join(dir, '../../index.css'), 'utf8');
    expect(css).not.toContain('data-opponent-count="4"');
    expect(css).toContain('overflow-y: hidden');
    expect(css).toContain('flex-wrap: nowrap');
    expect(css).not.toContain('0.38fr');
    expect(css).toContain('grid-template-rows: auto auto auto');
  });
});

describe('opponents collapse Dialog (L53-07)', () => {
  it('keeps seats on one nowrap row so the panel does not grow off-screen', () => {
    const table = readFileSync(join(dir, '../table.tsx'), 'utf8');
    expect(table).toContain('opponents-dialog-row');
    expect(table).toContain('w-full min-w-0 flex-nowrap gap-2 overflow-x-auto');
    const seat = source('opponent-zone.tsx');
    expect(seat).toContain('flex-nowrap');
    expect(seat).toContain('overflow-hidden');
  });
});

describe('felt chrome collapse wiring (L53-05)', () => {
  it('opens Incoming, log, and opponents from collapsed buttons', () => {
    const table = readFileSync(join(dir, '../table.tsx'), 'utf8');
    expect(table).toContain('feltCollapseFromCounts');
    expect(table).toContain('viewportHeight');
    expect(table).toContain("setChromeOpen('incoming')");
    expect(table).toContain("setChromeOpen('log')");
    expect(table).toContain("setChromeOpen('opponents')");
    expect(source('private-zone.tsx')).toContain('incoming-collapsed');
    expect(source('table-shell.tsx')).toContain('log-collapsed');
    expect(source('table-shell.tsx')).toContain('opponents-collapsed');
  });
});
