import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView, CardId, PlayingStateView } from '@card-battle/shared';

import { log, type LogCardSegment, type LogLine } from './log';
import { makePlayer, makePlayingView } from './test-fixtures';

function draw(turnSequence: number, actorPlayerId = 'me'): ActionLogEntryView {
  return { kind: 'actionPlayed', actorPlayerId, action: 'draw', turnSequence };
}

/** `count` seats: the POV `me`, then `p1`, `p2`… in turn order. */
function tableOf(count: number, actionLog: readonly ActionLogEntryView[]): PlayingStateView {
  const ids = ['me', ...Array.from({ length: count - 1 }, (_, i) => `p${String(i + 1)}`)];
  return makePlayingView({
    players: ids.map((id) => makePlayer(id, id === 'me' ? { isYou: true } : {})),
    turnOrder: ids,
    actionLog,
  });
}

function cards(line: LogLine | null | undefined): LogCardSegment[] {
  return (line?.segments ?? []).filter((s): s is LogCardSegment => s.type === 'card');
}

function roundsOf(view: PlayingStateView): { round: number; indexes: number[] }[] {
  return log(view).rounds.map((g) => ({ round: g.round, indexes: g.lines.map((l) => l.index) }));
}

function only(entry: ActionLogEntryView): LogLine | null {
  return log(makePlayingView({ actionLog: [entry] })).ticker;
}

describe('log() ticker and rounds (spec v7 §6.9)', () => {
  it('makes the latest entry the ticker, with nicknames from the view', () => {
    const view = makePlayingView({
      players: [
        makePlayer('me', { isYou: true, nickname: 'Ann' }),
        makePlayer('p1', { nickname: 'Bob' }),
        makePlayer('p2'),
      ],
      actionLog: [
        draw(0),
        { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'basic-attack',
          isUpgraded: false, targetPlayerId: 'me', turnSequence: 1 },
      ],
    });
    const { ticker } = log(view);
    expect(ticker?.index).toBe(1);
    expect(ticker?.kind).toBe('actionPlayed');
    expect(ticker?.turnSequence).toBe(1);
    expect(ticker?.text).toBe('Bob attacks Ann with Basic attack (1)');
    expect(ticker?.segments).toEqual([
      { type: 'player', playerId: 'p1', nickname: 'Bob' },
      { type: 'text', text: ' attacks ' },
      { type: 'player', playerId: 'me', nickname: 'Ann' },
      { type: 'text', text: ' with ' },
      { type: 'card', cardId: 'basic-attack', isUpgraded: false, inspectable: true },
      { type: 'damage', amount: 1 },
    ]);
  });

  it('has no ticker and no rounds for an empty log', () => {
    expect(log(makePlayingView())).toEqual({ ticker: null, rounds: [] });
  });

  it('splits rounds every 4 turns at 4 seats', () => {
    const view = tableOf(4, [draw(0), draw(3, 'p3'), draw(4), draw(7, 'p3'), draw(8)]);
    expect(roundsOf(view)).toEqual([
      { round: 1, indexes: [0, 1] },
      { round: 2, indexes: [2, 3] },
      { round: 3, indexes: [4] },
    ]);
  });

  it('splits rounds every 8 turns at 8 seats', () => {
    const view = tableOf(8, [draw(0), draw(7, 'p7'), draw(8), draw(15, 'p7'), draw(16)]);
    expect(roundsOf(view)).toEqual([
      { round: 1, indexes: [0, 1] },
      { round: 2, indexes: [2, 3] },
      { round: 3, indexes: [4] },
    ]);
  });
});

describe('log() renders only what the server sent (spec v7 §6.9)', () => {
  it("reads a fogged pool buy as 'a card from the pool' with no inspectable card", () => {
    const { rounds } = log(makePlayingView({ actionLog: [
      { kind: 'actionPlayed', actorPlayerId: 'me', action: 'buyPoolCard', cardId: 'thief',
        isUpgraded: false, turnSequence: 0 },
      { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buyPoolCard', turnSequence: 1 },
    ] }));
    const [named, fogged] = rounds.flatMap((round) => round.lines);
    expect(fogged?.text).toBe('p1 bought a card from the pool');
    expect(cards(fogged)).toEqual([]);
    expect(named?.text).toBe('me bought Thief from the pool');
    expect(cards(named)).toEqual([{ type: 'card', cardId: 'thief', isUpgraded: false, inspectable: true }]);
  });

  it('renders an unspied Ghost point gain as +?', () => {
    const line = only({
      kind: 'actionResolved', effectId: 'e-ghost', sourcePlayerId: 'me', targetPlayerId: 'p1',
      cardId: 'basic-attack', isUpgraded: false, livesLost: 2, shieldAbsorbed: 0,
      outcome: 'applied', turnSequence: 1,
      playerDeltas: [{ playerId: 'p1', deltas: [
        { kind: 'life', amount: -2 },
        { kind: 'point', concealed: true, direction: 'gain' },
      ] }],
    });
    expect(line?.text).toBe("me's Basic attack hits p1 −2 +?");
    expect(line?.segments.filter((s) => s.type === 'resource')).toEqual([
      { type: 'resource', kind: 'life', direction: 'loss', label: '−2', spoken: '−2 lives' },
      { type: 'resource', kind: 'point', direction: 'gain', label: '+?', spoken: 'concealed points gain' },
    ]);
  });
});

describe('log() inspectable card segments (L56-05)', () => {
  const inspectable: readonly (readonly [string, ActionLogEntryView, readonly CardId[]])[] = [
    ['a play', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'playCard', cardId: 'absorber',
      isUpgraded: false, targetPlayerId: 'p1', turnSequence: 0 }, ['absorber']],
    ['a multi-attack', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'playMultipleAttacks',
      turnSequence: 0, attacks: [
        { cardId: 'basic-attack', targetPlayerId: 'p1', isUpgraded: false },
        { cardId: 'basic-attack', targetPlayerId: 'p2', isUpgraded: true },
      ] }, ['basic-attack', 'basic-attack']],
    ['a named pool buy', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'buyPoolCard',
      cardId: 'thief', isUpgraded: false, turnSequence: 0 }, ['thief']],
    ['a deactivation', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'deactivatePersistent',
      cardId: 'poison', isUpgraded: false, turnSequence: 0 }, ['poison']],
    ['a resolution', { kind: 'actionResolved', effectId: 'e-spy', sourcePlayerId: 'me',
      targetPlayerId: 'p1', cardId: 'spy', isUpgraded: false, livesLost: 0, shieldAbsorbed: 0,
      outcome: 'applied', turnSequence: 0 }, ['spy']],
    ['a Mirror redirect', { kind: 'mirrorRedirected', actorPlayerId: 'me', cardId: 'super-attack',
      isUpgraded: false, damageMultiplier: 2, previousTargetPlayerId: 'me', newTargetPlayerId: 'p1',
      turnSequence: 0 }, ['super-attack']],
    ['a Curse transfer', { kind: 'curseTransferred', fromPlayerId: 'p1', toPlayerId: 'me',
      cardId: 'curse', isUpgraded: false, effectId: 'c1', turnSequence: 0 }, ['curse']],
    ['a lost persistent', { kind: 'persistentDeactivated', ownerPlayerId: 'p2',
      cardId: 'imposition', isUpgraded: true, turnSequence: 0 }, ['imposition']],
  ];
  it.each(inspectable)('marks every card on %s inspectable', (_label, entry, cardIds) => {
    const line = only(entry);
    expect(cards(line).map((c) => c.cardId)).toEqual(cardIds);
    expect(cards(line).every((c) => c.inspectable)).toBe(true);
  });

  const plain: readonly (readonly [string, ActionLogEntryView])[] = [
    ['a draw', draw(0, 'p1')],
    ['a buy', { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buyCard', turnSequence: 0 }],
    ['a sell', { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'sellCard', turnSequence: 0 }],
    ['an upgrade', { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'upgradeCard', turnSequence: 0 }],
    ['an elimination', { kind: 'playerEliminated', playerId: 'p2', eliminatorPlayerId: 'p1',
      reason: 'combat', turnSequence: 0 }],
    ['a reward claim', { kind: 'rewardsClaimed', eliminatorPlayerId: 'p1', eliminatedPlayerId: 'p2',
      turnSequence: 0 }],
    ['a Sentence countdown', { kind: 'sentenceCountdown', sourcePlayerId: 'p1',
      remainingOwnerTurns: 3, turnSequence: 0 }],
    ['a Sentence fire', { kind: 'sentenceFired', sourcePlayerId: 'p1', targetPlayerId: 'me',
      turnSequence: 0 }],
  ];
  it.each(plain)('gives %s no inspectable card', (_label, entry) => {
    expect(cards(only(entry))).toEqual([]);
  });

  it('keeps the blockedBy card name as plain text', () => {
    const line = only({
      kind: 'actionResolved', effectId: 'e-block', sourcePlayerId: 'p1', targetPlayerId: 'me',
      cardId: 'basic-attack', isUpgraded: false, livesLost: 0, shieldAbsorbed: 0,
      outcome: 'blocked', blockedBy: 'attack-thief', turnSequence: 0,
    });
    expect(line?.text).toBe('Basic attack from p1 against me is blocked by Attack Thief');
    expect(cards(line)).toEqual([{ type: 'card', cardId: 'basic-attack', isUpgraded: false, inspectable: true }]);
    expect(line?.segments.at(-1)).toEqual({ type: 'text', text: 'Attack Thief' });
  });
});
