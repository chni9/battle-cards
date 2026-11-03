/** Pending effect words: the V2 `pending-queue.tsx` chip copy, reused verbatim (L74-05). */
import { describe, expect, it } from 'vitest';

import { makePending, makeTableView } from '../../view-model/test-fixtures';
import { threats, type ThreatEntry } from '../../view-model/threats';
import { pendingEffectCopy } from './threat-copy';

function entryOf(pending: Parameters<typeof makePending>[0]): ThreatEntry {
  const [entry] = threats(makeTableView(['me', 'p1', 'p2'], { pendingEffects: [makePending(pending)] }), null).entries;
  if (entry === undefined) throw new Error('no entry');
  return entry;
}
const NICKS: Readonly<Record<string, string>> = { me: 'Ana', p1: 'Bo', p2: 'Cy' };
const nick = (id: string): string => NICKS[id] ?? id;

describe('pendingEffectCopy (V2 chip words)', () => {
  it('names an attack, its route, its queue slot and its own damage', () => {
    expect(pendingEffectCopy(entryOf({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 4 }), nick)).toEqual({
      label: 'Strong attack',
      ariaLabel: 'Inspect Strong attack',
      title: 'Strong attack · Bo → Ana · queued #4 · 2 damage',
    });
  });

  it('gives an effect no damage and marks an upgraded card with +', () => {
    expect(pendingEffectCopy(entryOf({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'spy', isUpgraded: true, queuedAt: 6 }), nick).title)
      .toBe('Spy + · Cy → Bo · queued #6');
  });

  it('appends the Mirror that redirected it', () => {
    expect(pendingEffectCopy(entryOf({ id: 'e3', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', redirectedBy: 'super-mirror' }), nick).title)
      .toBe('Basic attack · Bo → Cy · queued #1 · 1 damage · Super Mirror');
  });
});
