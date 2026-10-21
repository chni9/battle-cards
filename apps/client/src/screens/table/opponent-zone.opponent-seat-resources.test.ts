/**
 * Opponent seat resource visibility — L51-08 / L51-10.
 * Opponent-zone part, split from screens/table/opponent-seat-resources.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('opponent seat resources (L51-08)', () => {
  it('drops Hidden kit / Spied-tap copy and never prints unspied totals', () => {
    const zone = readFileSync(join(dir, 'opponent-zone.tsx'), 'utf8');
    const dialog = readFileSync(join(dir, 'opponent-reveal-dialog.tsx'), 'utf8');
    expect(zone).not.toContain('HIDDEN_KIT_LABEL');
    expect(zone).not.toContain('Spied — tap');
    expect(zone).not.toContain('Revealed — tap');
    expect(zone).not.toContain('Hidden kit');
    expect(dialog).toContain('(eliminated)');
    expect(dialog).not.toContain('— Spy');
    expect(dialog).not.toContain('resourcesSnapshot');
    expect(zone).toContain("'unknown'");
  });

  it('stacks resources beside the portrait and actives under it (L51-10)', () => {
    const zone = readFileSync(join(dir, 'opponent-zone.tsx'), 'utf8');
    expect(zone).toContain('data-zone="opponent-resources"');
    expect(zone).toContain('flex shrink-0 flex-col items-start gap-0');
    expect(zone).toContain('data-zone="opponent-portrait"');
    expect(zone).toContain('data-zone="opponent-actives"');
    expect(zone).not.toContain('omitShield');
    expect(zone).not.toContain('ResizeObserver');
    expect(zone).not.toContain('flex-wrap items-center gap-x-1');
    expect(zone).toMatch(
      /data-zone="opponent-portrait"[\s\S]*<ActiveThumbs[\s\S]*<OpponentSeatResourceColumn/,
    );
    const css = readFileSync(join(dir, '../../index.css'), 'utf8');
    expect(css).toContain('overflow-y: hidden');
    expect(css).not.toContain('max-height: 40dvh');
  });
});
