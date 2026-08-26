/**
 * Opponent seat resource visibility — L51-08.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { KitId } from '@card-battle/shared';

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
          kitId: 'scientific' as KitId,
          hand: [],
          specialCards: [],
          resourcesSnapshot: snapshot,
        },
      }),
    ).toEqual({ known: false });
    expect(opponentKitIsVisible({ spied: {
      kitId: 'scientific' as KitId,
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
          kitId: 'scientific' as KitId,
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
          kitId: 'kamikaze' as KitId,
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
});
