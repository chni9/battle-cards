/**
 * Arena test views — Lot 74 plan Appendix A.4, technical spec v7 §6.3 (one tier per wire shape).
 */
import { describe, expect, it } from 'vitest';

import { viewportModeFor } from '../../ui/viewport-mode';
import { makeEliminationReveal } from '../../view-model/test-fixtures';
import {
  ARENA_SPIED_RESOURCES,
  ARENA_TEST_BOXES,
  arenaSpies,
  expectNoArenaIntent,
  makeArenaProps,
  makeArenaView,
  makeTutorialArenaView,
  TUTORIAL_HUMAN_INDICES,
} from './test-view';

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
      lastTurnStarted: null, cachedLobbyRules: null, connectionStatus: 'connected',
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

  it('names each layout test box after its mode (R1)', () => {
    const modes = Object.fromEntries(Object.entries(ARENA_TEST_BOXES).map(([name, box]) => [name, viewportModeFor(box.viewport)]));
    expect(modes).toEqual({
      phone360: 'portrait', phone375: 'portrait', phone390: 'portrait', duplicator360: 'portrait', tablet: 'portrait',
      landscape: 'landscape-compact', landscapeSmall: 'landscape-compact', desktop: 'desktop', desktopShort: 'desktop',
    });
  });

  it('lists the 16 human tutorial indices: 0, then odd 1–29 (L75-04)', () => {
    expect(TUTORIAL_HUMAN_INDICES).toEqual([0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
  });

  it('builds a 2-seat tutorial view per index from the setup and the script, overrides last (L75-04)', () => {
    const ids = (index: number): string[] => makeTutorialArenaView(index).self.hand.map((card) => card.instanceId);
    const start = makeTutorialArenaView(0);
    expect([start.playKind, start.tutorialIndex, start.you, start.currentTurnPlayerId, start.self.kitId, start.players.map((p) => p.id)])
      .toEqual(['tutorial', 0, 'me', 'me', 'indestructible', ['me', 'p1']]);
    expect([ids(0), start.self.specialCards.map((card) => card.instanceId), start.players[1]?.isBot, start.players[1]?.spied])
      .toEqual([['tax-1', 'spy-1', 'basic-attack-1', 'shield-1', 'shield-2'], ['super-regeneration-1'], true, undefined]);
    expect(makeTutorialArenaView(2).currentTurnPlayerId).toBe('p1');
    expect(makeTutorialArenaView(3).pendingEffects.map((e) => [e.id, e.cardId, e.sourcePlayerId, e.targetPlayerId])).toEqual([['tut-3', 'basic-attack', 'p1', 'me']]);
    expect([makeTutorialArenaView(8).players[1]?.spied, makeTutorialArenaView(9).players[1]?.spied?.kitId]).toEqual([undefined, 'ghost']);
    expect(makeTutorialArenaView(7).self.hand.find((card) => card.cardId === 'spy')?.isUpgraded).toBe(true);
    expect([ids(11), ids(17)]).toEqual([['tax-1', 'spy-1', 'basic-attack-1', 'shield-2'], ['tax-1', 'spy-1', 'basic-attack-1', 'shield-2', 'absorber-1']]);
    expect([makeTutorialArenaView(21).self.specialCards, makeTutorialArenaView(25).self.hand.find((card) => card.cardId === 'basic-attack')?.isUpgraded]).toEqual([[], true]);
    expect(makeTutorialArenaView(5, { gameCode: 'TUTOR1' }).gameCode).toBe('TUTOR1');
    expect(() => makeTutorialArenaView(31)).toThrow(RangeError);
  });
});
