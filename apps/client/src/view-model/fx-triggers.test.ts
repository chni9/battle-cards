/**
 * FX trigger decisions: technical spec v7 §6.6.2, §6.12, §8.1, Q63; Appendix A `table-fx-token-chips`,
 * `table-fx-card-ghosts`, `table-fx-resolution-elim-reward` (L74-17). The logic moved out of `screens/table.tsx`.
 */
import type { ActionLogEntryView, ActionResolvedPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { getCardArtUrl, getCardBackUrl } from '../ui/asset-lookup';
import {
  eliminationBeatKey, eliminationBeatKeys, logFxPlan, newEliminationBeats, ownIntentFxSteps,
  resolutionFlashKey, unseenLogEntries, type LogFxInput,
} from './fx-triggers';
import { makeCard, makePlayer } from './test-fixtures';

const PLAYERS = [makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2')];
const elim = (playerId: string, turnSequence: number): ActionLogEntryView =>
  ({ kind: 'playerEliminated', playerId, eliminatorPlayerId: null, reason: 'combat', turnSequence });
const played = (actorPlayerId: string, action: 'buyCard' | 'playCard', turnSequence: number): ActionLogEntryView =>
  ({ kind: 'actionPlayed', actorPlayerId, action, cardId: 'spy', turnSequence });
const plan = (entries: readonly ActionLogEntryView[], extra: Partial<LogFxInput> = {}) =>
  logFxPlan({ entries, prev: new Map(), next: new Map(), you: 'me', players: PLAYERS, selfKitId: 'kamikaze', ...extra });

describe('fx triggers (L74-17)', () => {
  it('keys a resolution by effect and outcome, an elimination by player, turn and reason (Lot 14, Q63)', () => {
    const hit: ActionResolvedPayload = { effectId: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', isUpgraded: false, livesLost: 1, shieldAbsorbed: 0, outcome: 'applied' };
    expect(resolutionFlashKey(hit)).toBe('e1:applied');
    expect(eliminationBeatKey({ kind: 'playerEliminated', playerId: 'p1', eliminatorPlayerId: null, reason: 'combat', turnSequence: 3 })).toBe('p1:3:combat');
  });

  it('seeds every past elimination and then returns only new ones, once each, in log order (Q63)', () => {
    const seen = eliminationBeatKeys([elim('p1', 3), played('p2', 'buyCard', 4)]);
    const next = newEliminationBeats(seen, [elim('p1', 3), elim('p2', 5), elim('p2', 5), elim('me', 6)]);
    expect(next.playerIds).toEqual(['p2', 'me']);
    expect(newEliminationBeats(next.seen, [elim('p1', 3), elim('p2', 5), elim('me', 6)]).playerIds).toEqual([]);
  });

  it('returns unseen log entries once each, in log order', () => {
    const first = unseenLogEntries(new Set(), [played('p1', 'buyCard', 2), played('p1', 'buyCard', 2), elim('p2', 3)]);
    expect(first.entries).toEqual([played('p1', 'buyCard', 2), elim('p2', 3)]);
    expect(unseenLogEntries(first.seen, [played('p1', 'buyCard', 2), elim('p2', 3)]).entries).toEqual([]);
  });

  it('plans an opponent buy as its chips, then one verso deck ghost, and no play ghost (L51-13)', () => {
    const steps = plan([played('p1', 'buyCard', 2)]);
    expect(steps.map((step) => step.kind)).toEqual(['chips', 'deck-ghost']);
    expect(steps[1]).toEqual({ kind: 'deck-ghost', ghost: { playerId: 'p1', artUrl: getCardBackUrl('action'), direction: 'buy' } });
  });

  it("plans a face-up play ghost for an opponent's play and none for the POV's own play (§6.6.2)", () => {
    expect(plan([played('p1', 'playCard', 2)]).filter((step) => step.kind === 'play-ghost')).toEqual([
      { kind: 'play-ghost', ghost: { playerId: 'p1', artUrl: getCardArtUrl('spy', { isUpgraded: false }), direction: 'sell' } },
    ]);
    expect(plan([played('me', 'playCard', 2)]).filter((step) => step.kind !== 'chips')).toEqual([]);
  });

  it('flies the live leg the log did not explain (L51-15)', () => {
    const snap = { lives: 10, points: 10, upgradePoints: 0, shield: 0 };
    expect(plan([], { prev: new Map([['me', snap]]), next: new Map([['me', { ...snap, points: 13 }]]) })).toEqual([
      { kind: 'chips', chips: [{ kind: 'point', count: 3, from: 'log', to: { playerId: 'me' } }] },
    ]);
  });

  it('maps own intents to steps: a held card flies, one no longer held does not (V2 findOwnCard)', () => {
    const held = { hand: [makeCard('spy'), makeCard('basic-attack', { isUpgraded: true })], specialCards: [makeCard('poison')] };
    expect(ownIntentFxSteps({ kind: 'play', instanceId: 'spy-1', origin: { x: 5, y: 6 } }, held)).toEqual([
      { kind: 'play-ghost', instanceId: 'spy-1', artUrl: getCardArtUrl('spy', { isUpgraded: false }), origin: { x: 5, y: 6 } },
    ]);
    expect(ownIntentFxSteps({ kind: 'play', instanceId: 'gone-1' }, held)).toEqual([]);
    expect(ownIntentFxSteps({ kind: 'multi-attack', instanceIds: ['basic-attack-1', 'gone-1'] }, held)).toEqual([
      { kind: 'play-ghost', instanceId: 'basic-attack-1', artUrl: getCardArtUrl('basic-attack', { isUpgraded: true }) },
    ]);
    expect(ownIntentFxSteps({ kind: 'sell', instanceId: 'poison-1' }, held)).toEqual([
      { kind: 'sell-flyout', instanceId: 'poison-1', cardId: 'poison', isUpgraded: false },
    ]);
    expect(ownIntentFxSteps({ kind: 'buy-card', cardId: 'spy' }, held)).toEqual([{ kind: 'buy-card-flyout', cardId: 'spy' }]);
    expect(ownIntentFxSteps({ kind: 'buy-special' }, held)).toEqual([{ kind: 'buy-special-flyout' }]);
  });
});
