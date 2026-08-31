/**
 * Opponent seat resource visibility — L51-08.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  opponentHasLiveResourceIcons,
  opponentKitIsVisible,
  opponentResourceDisplay,
} from './opponent-seat-resources';

const dir = dirname(fileURLToPath(import.meta.url));

const snapshot = {
  lives: 12,
  points: 9,
  upgradePoints: 2,
  shield: 4,
  turnSequence: 3,
};

describe('opponent seat resources (L51-08)', () => {
  it('shows unknown for unspied and base Spy, never snapshot totals', () => {
    expect(opponentResourceDisplay({})).toEqual({ known: false });
    expect(
      opponentResourceDisplay({
        spied: {
          kitId: 'scientific',
          hand: [],
          specialCards: [],
          resourcesSnapshot: snapshot,
        },
      }),
    ).toEqual({ known: false });
    expect(opponentKitIsVisible({ spied: {
      kitId: 'scientific',
      hand: [],
      specialCards: [],
      resourcesSnapshot: snapshot,
    } })).toBe(true);
    expect(opponentHasLiveResourceIcons({})).toBe(false);
  });

  it('uses live upgraded Spy numbers and death reveal', () => {
    expect(
      opponentResourceDisplay({
        spied: {
          kitId: 'scientific',
          hand: [],
          specialCards: [],
          lives: 8,
          points: 3,
          upgradePoints: 1,
          shield: 0,
          resourcesSnapshot: snapshot,
        },
      }),
    ).toEqual({
      known: true,
      values: { lives: 8, points: 3, upgradePoints: 1, shield: 0 },
    });
    expect(
      opponentResourceDisplay({
        eliminationReveal: {
          kitId: 'kamikaze',
          hand: [],
          specialCards: [],
          lives: 0,
          points: 5,
          upgradePoints: 0,
          shield: 2,
          shieldIsUpgraded: false,
          turnSequence: 9,
        },
      }).known,
    ).toBe(true);
  });

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
