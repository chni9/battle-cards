/**
 * Arena test views — Lot 74 plan Appendix A.4, technical spec v7 §6.3 (one tier per wire shape).
 */
import { describe, expect, it } from 'vitest';

import { makeEliminationReveal } from '../../view-model/test-fixtures';
import { ARENA_SPIED_RESOURCES, arenaSpies, expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

describe('arena test views (Appendix A.4)', () => {
  it('seats me then p1…p7 in turn order with me as the POV, 3 seats by default', () => {
    expect(makeArenaView().players.map((player) => player.id)).toEqual(['me', 'p1', 'p2']);
    const eight = makeArenaView({ seatCount: 8 });
    expect(eight.turnOrder).toEqual(['me', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    expect(eight.players.filter((player) => player.isYou).map((player) => player.id)).toEqual(['me']);
    expect([eight.you, eight.isSpectator]).toEqual(['me', undefined]);
    expect(() => makeArenaView({ seatCount: 1 })).toThrow(RangeError);
    expect(() => makeArenaView({ seatCount: 9 })).toThrow(RangeError);
  });

  it('builds every §6.3 tier from the wire fields only', () => {
    const view = makeArenaView({ seatCount: 5, tiers: { p1: 'base-spy', p2: 'spy-plus', p3: 'eliminated' } });
    const [, p1, p2, p3, p4] = view.players;
    expect(ARENA_SPIED_RESOURCES).toEqual({ lives: 7, points: 12, upgradePoints: 1, shield: 2 });
    expect(p1?.spied).toEqual({ lives: 7, points: 12, upgradePoints: 1, shield: 2 });
    expect(p2?.spied).toEqual({
      lives: 7, points: 12, upgradePoints: 1, shield: 2, kitId: 'tactician',
      hand: [
        { instanceId: 'p2-basic-attack', cardId: 'basic-attack', isUpgraded: false },
        { instanceId: 'p2-spy', cardId: 'spy', isUpgraded: false },
      ],
      specialCards: [],
    });
    expect([p3?.isEliminated, p3?.eliminationReveal, p3?.spied]).toEqual([true, makeEliminationReveal(), undefined]);
    expect([p4?.isEliminated, p4?.spied, p4?.eliminationReveal]).toEqual([false, undefined, undefined]);
  });

  it('makes a walk-in watcher with no seated POV', () => {
    const view = makeArenaView({ pov: 'walk-in', tiers: { me: 'spy-plus' } });
    expect([view.you, view.isSpectator]).toEqual(['watcher', true]);
    expect(view.players.some((player) => player.isYou)).toBe(false);
    expect(view.players[0]?.spied?.kitId).toBe('tactician');
  });

  it('marks an eliminated POV, and a Reanimating one with its pending Reanimation', () => {
    const dead = makeArenaView({ pov: 'eliminated' }).players[0];
    expect([dead?.isYou, dead?.isEliminated, dead?.eliminationReveal, dead?.pendingReanimation])
      .toEqual([true, true, makeEliminationReveal(), null]);
    expect(makeArenaView({ pov: 'reanimating' }).players[0]?.pendingReanimation).toEqual({ isUpgraded: false });
  });

  it('spreads overrides last', () => {
    expect(makeArenaView({ overrides: { currentTurnPlayerId: 'p1', gameCode: 'ABCDEF' } }))
      .toMatchObject({ currentTurnPlayerId: 'p1', gameCode: 'ABCDEF', you: 'me' });
  });

  it('gives every callback a spy and lists the 17 intent spies, none called', () => {
    const props = makeArenaProps();
    expect(props).toMatchObject({
      actionReject: null, statusLabel: 'Connected', nowMs: 0, deadlineMs: null, lastActionResolved: null, subChoice: null,
    });
    expect(props.view.players.map((player) => player.id)).toEqual(['me', 'p1', 'p2']);
    expect([props.readOnly, props.youWon, props.onShowStats, props.onOpenFeedback]).toEqual([undefined, undefined, undefined, undefined]);
    const spies = arenaSpies(props);
    expect(spies).toHaveLength(17);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
    expect(arenaSpies(makeArenaProps({ readOnly: true })).length).toBe(17);
    expectNoArenaIntent(props);
    props.onDraw();
    expect(() => {
      expectNoArenaIntent(props);
    }).toThrow();
  });
});
