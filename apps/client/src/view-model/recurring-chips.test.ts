import { describe, expect, it } from 'vitest';

import type { PersistentEffectView, PlayingStateView, PrivateSelfView, PublicPlayerView } from '@card-battle/shared';

import { recurringChips } from './recurring-chips';
import { makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';
import { threats } from './threats';

const poison = (id: string, isUpgraded = false): PersistentEffectView =>
  makePersistent({ id, cardId: 'poison', counter: 3, isUpgraded });
const imposition = (id: string, isUpgraded = false): PersistentEffectView =>
  makePersistent({ id, cardId: 'imposition', counter: 2, isUpgraded });
// Curse is victim-owned with a null counter (server cards/handlers/curse.ts).
const curse = (id: string, isUpgraded = false): PersistentEffectView =>
  makePersistent({ id, cardId: 'curse', isUpgraded });
const invisibility = makePersistent({ id: 'inv', cardId: 'invisibility', counter: 3 });

/** POV 'me' (12 points, cursed with cu1); p1 holds Poison po1, p2 holds Imposition im1. */
function table(input: {
  me?: Partial<PublicPlayerView>;
  self?: Partial<PrivateSelfView>;
  p1?: Partial<PublicPlayerView>;
  p2?: Partial<PublicPlayerView>;
}): PlayingStateView {
  return makePlayingView({
    players: [
      makePlayer('me', { isYou: true, ...input.me }),
      makePlayer('p1', { activePersistentEffects: [poison('po1')], ...input.p1 }),
      makePlayer('p2', { activePersistentEffects: [imposition('im1')], ...input.p2 }),
    ],
    self: makeSelf({ points: 12, activePersistentEffects: [curse('cu1')], ...input.self }),
  });
}

function stateById(view: PlayingStateView): Record<string, string> {
  return Object.fromEntries(recurringChips(view).map((chip) => [chip.effectId, chip.state]));
}

describe('recurringChips (spec v7 §6.5, Q35)', () => {
  it('lists a Curse on the POV and opponent Poison and Imposition at their base rates', () => {
    expect(recurringChips(table({}))).toEqual([
      { effectId: 'cu1', cardId: 'curse', ownerPlayerId: 'me', isUpgraded: false, amount: { kind: 'life-per-points-spent', pointsPerLife: 3 }, state: 'live' },
      { effectId: 'po1', cardId: 'poison', ownerPlayerId: 'p1', isUpgraded: false, amount: { kind: 'lives-per-turn', lives: 1 }, state: 'live' },
      { effectId: 'im1', cardId: 'imposition', ownerPlayerId: 'p2', isUpgraded: false, amount: { kind: 'points-above-floor', maxPoints: 2, floor: 7 }, state: 'live' },
    ]);
  });

  it('shows the upgraded rate of each tier', () => {
    const view = table({
      self: { activePersistentEffects: [curse('cu1', true)] },
      p1: { activePersistentEffects: [poison('po1', true)] },
      p2: { activePersistentEffects: [imposition('im1', true)] },
    });
    expect(recurringChips(view).map((chip) => [chip.effectId, chip.isUpgraded, chip.amount])).toEqual([
      ['cu1', true, { kind: 'life-per-points-spent', pointsPerLife: 2 }],
      ['po1', true, { kind: 'lives-per-turn', lives: 2 }],
      ['im1', true, { kind: 'points-above-floor', maxPoints: 4, floor: 7 }],
    ]);
  });

  it.each([
    ['blockTurnsRemaining > 0', { blockTurnsRemaining: 2 }],
    ['blockAttacksForbidden', { blockAttacksForbidden: true }],
  ] as const)('pauses opponent Poison and Imposition, not a Curse on the POV, during Block (%s)', (_label, me) => {
    expect(stateById(table({ me }))).toEqual({ cu1: 'live', po1: 'paused', im1: 'paused' });
  });

  it('pauses all three under own Invisibility', () => {
    const view = table({ self: { activePersistentEffects: [invisibility, curse('cu1')] } });
    expect(stateById(view)).toEqual({ cu1: 'paused', po1: 'paused', im1: 'paused' });
  });

  it('pauses Imposition at 7 points and keeps it live at 8', () => {
    expect(stateById(table({ self: { points: 7 } }))['im1']).toBe('paused');
    expect(stateById(table({ self: { points: 8 } }))['im1']).toBe('live');
    expect(stateById(table({ self: { points: 0 } }))).toEqual({ cu1: 'live', po1: 'live', im1: 'paused' });
  });

  it('pauses Imposition only under an up, upgraded Shield; Poison keeps ticking', () => {
    expect(stateById(table({ self: { shield: 3, shieldIsUpgraded: true } }))).toEqual({ cu1: 'live', po1: 'live', im1: 'paused' });
    expect(stateById(table({ self: { shield: 3, shieldIsUpgraded: false } }))['im1']).toBe('live');
    expect(stateById(table({ self: { shield: 0, shieldIsUpgraded: true } }))['im1']).toBe('live');
  });

  it('ends a Curse on the POV at 1 life unless Invisibility pauses it (designer 2026-10-27)', () => {
    expect(stateById(table({ self: { lives: 1 } }))).toEqual({ cu1: 'ending', po1: 'live', im1: 'live' });
    expect(stateById(table({ self: { lives: 2 } }))['cu1']).toBe('live');
    expect(stateById(table({ self: { lives: 1, activePersistentEffects: [invisibility, curse('cu1')] } }))['cu1']).toBe('paused');
    expect(stateById(table({ self: { lives: 1 }, me: { blockTurnsRemaining: 2 } }))['cu1']).toBe('ending');
  });

  it('gives no chip for an eliminated owner or a depleted counter', () => {
    const view = table({
      self: { activePersistentEffects: [] },
      p1: { isEliminated: true },
      p2: {
        activePersistentEffects: [
          makePersistent({ id: 'im0', cardId: 'imposition', counter: 0 }),
          makePersistent({ id: 'po0', cardId: 'poison', counter: 0 }),
          // The `makePersistent` default counter is null, which the server skips too.
          makePersistent({ id: 'po-null', cardId: 'poison' }),
        ],
      },
    });
    expect(recurringChips(view)).toEqual([]);
  });

  it('keeps a Poison owned by an Invisible opponent live: the server never checks the owner', () => {
    const view = table({ p1: { activePersistentEffects: [invisibility, poison('po1')] } });
    expect(stateById(view)).toEqual({ cu1: 'live', po1: 'live', im1: 'live' });
  });

  it("ignores the POV's own Poison and Imposition and a Curse sitting on an opponent", () => {
    const view = table({
      self: { activePersistentEffects: [poison('own-po'), imposition('own-im')] },
      p1: { activePersistentEffects: [curse('cu-p1')] },
      p2: { activePersistentEffects: [] },
    });
    expect(recurringChips(view)).toEqual([]);
  });

  it('gives no chips to an eliminated POV or a walk-in', () => {
    expect(recurringChips(table({ me: { isEliminated: true } }))).toEqual([]);
    const walkIn = makePlayingView({
      you: 'watcher',
      isSpectator: true,
      currentTurnPlayerId: 'p1',
      turnOrder: ['p1', 'p2'],
      players: [makePlayer('p1', { activePersistentEffects: [poison('po1')] }), makePlayer('p2')],
    });
    expect(recurringChips(walkIn)).toEqual([]);
  });

  it('exposes the chips as threats().recurring', () => {
    const view = table({ me: { blockTurnsRemaining: 1 } });
    expect(threats(view, null).recurring).toEqual(recurringChips(view));
    expect(threats(view, null).recurring).toHaveLength(3);
  });
});
