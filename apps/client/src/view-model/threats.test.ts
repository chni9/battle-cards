import { describe, expect, it } from 'vitest';

import type {
  MirrorChoiceRequiredPayload,
  PendingEffectView,
  PlayingStateView,
  StealPickChoiceRequiredPayload,
  SubChoiceRequiredPayload,
} from '@card-battle/shared';

import { makePending, makePersistent, makePlayer, makePlayingView } from './test-fixtures';
import { gridThreatEntries, seatThreatIds, threats } from './threats';

const EIGHT_SEATS = ['me', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;

function viewWith(
  pendingEffects: readonly PendingEffectView[],
  seatIds: readonly string[] = ['me', 'p1', 'p2'],
): PlayingStateView {
  return makePlayingView({
    players: seatIds.map((id) => makePlayer(id, { isYou: id === 'me' })),
    turnOrder: seatIds,
    pendingEffects,
  });
}

describe('threats() labels (spec v7 §6.5, golden rule 1)', () => {
  it('gives three Assassin attacks on the POV three entries with their own labels and no total', () => {
    const model = threats(viewWith([
      makePending({ id: 'a1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 4 }),
      makePending({ id: 'a2', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 4 }),
      makePending({ id: 'a3', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', isUpgraded: true, queuedAt: 4 }),
    ]), null);
    expect(model.entries.map((entry) => entry.effectId)).toEqual(['a1', 'a2', 'a3']);
    const labels = model.entries.map((entry) => entry.label);
    expect(labels).toEqual([
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 4 },
    ]);
    expect(labels).not.toContainEqual({ kind: 'damage', amount: 6 });
    expect(model.fanOuts).toEqual([]);
  });

  it('multiplies the listed damage by damageMultiplier', () => {
    const model = threats(viewWith([
      makePending({ id: 'm1', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'strong-attack', damageMultiplier: 2, redirectedBy: 'mirror' }),
      makePending({ id: 'm2', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'super-attack', isUpgraded: true, damageMultiplier: 2, redirectedBy: 'mirror' }),
    ]), null);
    expect(model.entries.map((entry) => entry.label)).toEqual([
      { kind: 'damage', amount: 4 },
      { kind: 'damage', amount: 20 },
    ]);
  });

  it('labels a non-attack effect with its card icon', () => {
    const model = threats(viewWith([
      makePending({ id: 's1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' }),
      makePending({ id: 't1', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'thief', isUpgraded: true }),
    ]), null);
    expect(model.entries.map((entry) => [entry.label, entry.isUpgraded])).toEqual([
      [{ kind: 'effect', cardId: 'spy' }, false],
      [{ kind: 'effect', cardId: 'thief' }, true],
    ]);
  });
});

describe('threats() relation and tone', () => {
  it('sets relation, tone and the source seat colour from the POV', () => {
    const model = threats(viewWith([
      makePending({ id: 'in', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' }),
      makePending({ id: 'out', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'basic-attack' }),
      makePending({ id: 'tp-attack', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack' }),
      makePending({ id: 'tp-effect', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'thief' }),
    ]), null);
    expect(
      model.entries.map(({ effectId, relation, tone, sourceSeatColorIndex }) => ({ effectId, relation, tone, sourceSeatColorIndex })),
    ).toEqual([
      { effectId: 'in', relation: 'incoming', tone: 'effect', sourceSeatColorIndex: 1 },
      { effectId: 'out', relation: 'outgoing', tone: 'mine', sourceSeatColorIndex: 0 },
      { effectId: 'tp-attack', relation: 'third-party', tone: 'attack', sourceSeatColorIndex: 1 },
      { effectId: 'tp-effect', relation: 'third-party', tone: 'effect', sourceSeatColorIndex: 2 },
    ]);
  });

  it.each(['spy', 'thief', 'card-thief', 'spy-thief', 'upgrade-point-thief', 'attack-thief'] as const)(
    'gives incoming %s the other (effect) tone (L51-07, Q61)',
    (cardId) => {
      const [entry] = threats(viewWith([makePending({ id: 'x', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId })]), null).entries;
      expect(entry).toMatchObject({ relation: 'incoming', tone: 'effect' });
    },
  );

  it.each(['sentence', 'mirror', 'super-mirror'] as const)('gives incoming %s the attack tone', (cardId) => {
    const [entry] = threats(viewWith([makePending({ id: 'x', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId })]), null).entries;
    expect(entry).toMatchObject({ relation: 'incoming', tone: 'attack' });
  });

  it('keys side-by-side arrows on source, target, queuedAt and card', () => {
    const model = threats(viewWith([
      makePending({ id: 's1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 4 }),
      makePending({ id: 's2', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 4 }),
      makePending({ id: 's3', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 5 }),
      makePending({ id: 'b1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 4 }),
    ]), null);
    expect(model.entries.map((entry) => [entry.groupKey, entry.queuedAt])).toEqual([
      ['p1|me|4|strong-attack', 4],
      ['p1|me|4|strong-attack', 4],
      ['p1|me|5|strong-attack', 5],
      ['p1|me|4|basic-attack', 4],
    ]);
  });
});

describe('threats() Mirror state', () => {
  it('draws a redirected effect from the redirector with its Mirror or Super Mirror badge', () => {
    const model = threats(viewWith([
      makePending({ id: 'r1', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'basic-attack', redirectedBy: 'mirror' }),
      makePending({ id: 'r2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack', redirectedBy: 'super-mirror', damageMultiplier: 2 }),
      makePending({ id: 'd1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
    ]), null);
    expect(model.entries[0]).toMatchObject({ sourcePlayerId: 'p2', sourceSeatColorIndex: 2, relation: 'incoming', tone: 'attack', mirrorBadge: 'mirror' });
    expect(model.entries[1]).toMatchObject({ sourcePlayerId: 'p1', relation: 'third-party', mirrorBadge: 'super-mirror', label: { kind: 'damage', amount: 4 } });
    expect(model.entries[2]?.mirrorBadge).toBeNull();
  });

  it('flags Mirror-eligible ids only while a Mirror prompt is open', () => {
    const view = viewWith([
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
      makePending({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'super-attack', isUpgraded: true }),
    ]);
    const mirror: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['e1'], deadlineMs: 0 };
    const stealPick: StealPickChoiceRequiredPayload = { kind: 'steal-pick', victimPlayerId: 'p1', eligibleInstanceIds: ['e1'], deadlineMs: 0 };
    const flags = (subChoice: SubChoiceRequiredPayload | null): boolean[] =>
      threats(view, subChoice).entries.map((entry) => entry.mirrorEligible);
    expect(flags(mirror)).toEqual([true, false]);
    expect(flags(null)).toEqual([false, false]);
    expect(flags(stealPick)).toEqual([false, false]);
  });
});

describe('threats() fan-out', () => {
  it('makes MEGA ATTACK on 7 opponents one fan-out group with 7 target badges', () => {
    const targets = EIGHT_SEATS.filter((id) => id !== 'p1');
    const model = threats(viewWith(
      targets.map((id) => makePending({ id: `mega-${id}`, sourcePlayerId: 'p1', targetPlayerId: id, cardId: 'mega-attack', queuedAt: 3 })),
      EIGHT_SEATS,
    ), null);
    expect(model.entries).toHaveLength(7);
    expect(model.fanOuts).toEqual([{
      key: 'p1|3|mega-attack',
      sourcePlayerId: 'p1',
      cardId: 'mega-attack',
      queuedAt: 3,
      targets: targets.map((id) => ({ playerId: id, effectId: `mega-${id}`, label: { kind: 'damage', amount: 20 } })),
    }]);
    expect(model.entries.every((entry) => entry.fanOutKey === 'p1|3|mega-attack')).toBe(true);
    expect(model.entries[0]).toMatchObject({ targetPlayerId: 'me', relation: 'incoming', tone: 'attack' });
  });

  it('fans out an Assassin volley that hits every opponent, each badge keeping its own damage', () => {
    const model = threats(viewWith([
      makePending({ id: 'v1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 5 }),
      makePending({ id: 'v2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', isUpgraded: true, queuedAt: 5 }),
      makePending({ id: 'v3', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 5 }),
    ]), null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['p1|5|basic-attack']);
    expect(model.fanOuts[0]?.targets).toEqual([
      { playerId: 'me', effectId: 'v1', label: { kind: 'damage', amount: 1 } },
      { playerId: 'p2', effectId: 'v2', label: { kind: 'damage', amount: 3 } },
      { playerId: 'p2', effectId: 'v3', label: { kind: 'damage', amount: 1 } },
    ]);
  });

  it('does not fan out a volley that misses a living opponent', () => {
    const model = threats(viewWith([
      makePending({ id: 'v1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 5 }),
      makePending({ id: 'v2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 5 }),
    ], ['me', 'p1', 'p2', 'p3']), null);
    expect(model.fanOuts).toEqual([]);
    expect(model.entries.map((entry) => entry.fanOutKey)).toEqual([null, null]);
  });

  it.each([
    ['a living Invisible', { activePersistentEffects: [makePersistent({ id: 'inv', cardId: 'invisibility', counter: 3 })] }],
    ['an eliminated', { isEliminated: true }],
  ] as const)('fans out a volley that skips %s opponent', (_label, p3) => {
    // A basic attack is not a hits-all play, so only the coverage filter can burst it.
    const view = makePlayingView({
      players: [makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2'), makePlayer('p3', p3)],
      turnOrder: ['me', 'p1', 'p2', 'p3'],
      pendingEffects: [
        makePending({ id: 'v1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 6 }),
        makePending({ id: 'v2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 6 }),
      ],
    });
    const model = threats(view, null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['p1|6|basic-attack']);
    expect(model.fanOuts[0]?.targets.map((target) => target.label)).toEqual([
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 1 },
    ]);
  });

  it.each([
    ['mega-attack', false, true],
    ['suicide', false, true],
    ['attack-thief', false, true],
    ['card-thief', true, true],
    ['spy-thief', true, true],
    ['upgrade-point-thief', true, true],
    ['card-thief', false, false],
  ] as const)('after a copy resolved, %s (upgraded %s) keeps its burst: %s (designer 2026-10-27)', (cardId, isUpgraded, burst) => {
    // p2 has already resolved its copy on its own turn; me and p3 still wait.
    const model = threats(viewWith([
      makePending({ id: 'x-me', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId, isUpgraded, queuedAt: 3 }),
      makePending({ id: 'x-p3', sourcePlayerId: 'p1', targetPlayerId: 'p3', cardId, isUpgraded, queuedAt: 3 }),
    ], ['me', 'p1', 'p2', 'p3']), null);
    const key = `p1|3|${cardId}`;
    expect(model.fanOuts.map((group) => group.key)).toEqual(burst ? [key] : []);
    expect(model.entries.map((entry) => entry.fanOutKey)).toEqual(burst ? [key, key] : [null, null]);
  });

  it('draws a plain arrow once a single hits-all copy remains', () => {
    const model = threats(viewWith([
      makePending({ id: 'mega-me', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'mega-attack', queuedAt: 3 }),
    ], ['me', 'p1', 'p2', 'p3']), null);
    expect(model.fanOuts).toEqual([]);
    expect(model.entries.map((entry) => [entry.fanOutKey, entry.label])).toEqual([[null, { kind: 'damage', amount: 20 }]]);
  });

  it('keeps a Super Mirror burst after one copy resolved', () => {
    const model = threats(viewWith([
      makePending({ id: 'fx:dup:a:p1', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'strong-attack', queuedAt: 4, damageMultiplier: 2, redirectedBy: 'super-mirror' }),
      makePending({ id: 'fx:dup:a:p3', sourcePlayerId: 'me', targetPlayerId: 'p3', cardId: 'strong-attack', queuedAt: 4, damageMultiplier: 2, redirectedBy: 'super-mirror' }),
    ], ['me', 'p1', 'p2', 'p3']), null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['me|4|strong-attack']);
  });

  it('draws a hits-all play on a 2-seat table as a plain arrow', () => {
    const model = threats(viewWith([
      makePending({ id: 'mega-me', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'mega-attack', queuedAt: 3 }),
    ], ['me', 'p1']), null);
    expect(model.fanOuts).toEqual([]);
    expect(model.entries[0]?.fanOutKey).toBeNull();
  });

  it('keeps a base Suicide self-queue out of its fan-out', () => {
    const model = threats(viewWith([
      makePending({ id: 'su-p1', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'suicide', queuedAt: 2 }),
      makePending({ id: 'su-p2', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'suicide', queuedAt: 2 }),
      makePending({ id: 'su-me', sourcePlayerId: 'me', targetPlayerId: 'me', cardId: 'suicide', queuedAt: 2 }),
    ]), null);
    expect(model.fanOuts.map((group) => group.targets.map((target) => target.effectId))).toEqual([['su-p1', 'su-p2']]);
    expect(model.entries.map((entry) => [entry.effectId, entry.relation, entry.tone, entry.fanOutKey])).toEqual([
      ['su-p1', 'outgoing', 'mine', 'me|2|suicide'],
      ['su-p2', 'outgoing', 'mine', 'me|2|suicide'],
      ['su-me', 'incoming', 'effect', null],
    ]);
  });

  it('fans out a Super Mirror redirect to every opponent and keeps each badge', () => {
    const model = threats(viewWith([
      makePending({ id: 'fx:dup:a:p1', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'strong-attack', queuedAt: 4, damageMultiplier: 2, redirectedBy: 'super-mirror' }),
      makePending({ id: 'fx:dup:a:p2', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'strong-attack', queuedAt: 4, damageMultiplier: 2, redirectedBy: 'super-mirror' }),
    ]), null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['me|4|strong-attack']);
    expect(model.entries.map((entry) => [entry.mirrorBadge, entry.tone, entry.label])).toEqual([
      ['super-mirror', 'mine', { kind: 'damage', amount: 4 }],
      ['super-mirror', 'mine', { kind: 'damage', amount: 4 }],
    ]);
  });
});

describe('gridThreatEntries and seatThreatIds', () => {
  const model = threats(viewWith([
    makePending({ id: 'a', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
    makePending({ id: 'b', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'spy' }),
    makePending({ id: 'c', sourcePlayerId: 'p2', targetPlayerId: 'p3', cardId: 'thief' }),
    makePending({ id: 'd', sourcePlayerId: 'p3', targetPlayerId: 'p1', cardId: 'strong-attack' }),
  ], ['me', 'p1', 'p2', 'p3']), null);

  it("keeps POV arrows in grid mode and adds the tapped seat's", () => {
    const ids = (tapped: string | null): string[] => gridThreatEntries(model, 'me', tapped).map((entry) => entry.effectId);
    expect(ids(null)).toEqual(['a', 'b']);
    expect(ids('p3')).toEqual(['a', 'b', 'c', 'd']);
    expect(ids('p2')).toEqual(['a', 'b', 'c']);
  });

  it("lists a seat's incoming and outgoing ids for the tap highlight", () => {
    expect(seatThreatIds(model, 'p1')).toEqual({ incoming: ['d'], outgoing: ['a'] });
    expect(seatThreatIds(model, 'p2')).toEqual({ incoming: ['b'], outgoing: ['c'] });
  });
});
