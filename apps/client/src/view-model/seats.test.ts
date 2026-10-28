/**
 * seats() visibility tiers and seat anatomy — Lot 73 (L73-02), technical spec v7 §6.2, §6.3,
 * §6.12, §11 and §12.2. One test per tier, one per POV mode, then the seat anatomy. Every value
 * a seat shows must come from a field the server sent this recipient, so the tests also pin the
 * two inputs that look like they should unfog a seat and must not: the dead pre-Lot-69
 * `resourcesSnapshot` and a resolved Spy line in the action log.
 */

import type { PlayingStateView, PublicConnectionView, SpiedPlayerView } from '@card-battle/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  SEAT_BADGE_KINDS,
  SEAT_VISIBLE_BADGE_COUNT,
  connectionLabel,
  povModeOf,
  seatColorIndexOf,
  seatList,
  type SeatBadge,
  type SeatBadgeKind,
  type SeatModel,
} from './seats';
import {
  makeCard,
  makeEliminationReveal,
  makePersistent,
  makePlayer,
  makePlayingView,
} from './test-fixtures';

/** What the server sends for Spy+ and spectator vision (`buildSpiedView`, Lot 69). */
const FULL_VISION: SpiedPlayerView = {
  kitId: 'assassin',
  hand: [makeCard('basic-attack')],
  specialCards: [makeCard('mega-attack')],
  lives: 9,
  points: 4,
  upgradePoints: 1,
  shield: 3,
};
const ME = makePlayer('me', { isYou: true });

function seatOf(view: PlayingStateView, playerId: string): SeatModel {
  const seat = seatList(view).seats.find((entry) => entry.playerId === playerId);
  if (seat === undefined) throw new Error(`no seat for ${playerId}`);
  return seat;
}
const valuesOf = (seat: SeatModel): (number | '?')[] =>
  seat.resources.map((resource) => resource.value);
const kindsOf = (seat: SeatModel): string[] => seat.badges.map((badge) => badge.kind);
const connection = (partial: Partial<PublicConnectionView>): PublicConnectionView => ({
  status: 'connected',
  disconnectedAt: null,
  automaticTurnsTaken: 0,
  consecutiveTimeouts: 0,
  ...partial,
});

describe('seatList visibility tiers (technical spec v7 §6.3, one test per tier)', () => {
  it('unspied living opponent: public statuses only, every resource ?, kit hidden', () => {
    const poison = makePersistent({ id: 'poison-1', cardId: 'poison', counter: 2 });
    const view = makePlayingView({
      players: [
        ME,
        makePlayer('p1', {
          nickname: 'Zed',
          spyingOnYou: true,
          blockTurnsRemaining: 2,
          activeShield: { isUpgraded: true },
          activePersistentEffects: [poison],
          activeAttackBlock: true,
        }),
        makePlayer('p2'),
      ],
      pendingSentences: [
        { id: 'sentence-1', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false },
      ],
    });
    const seat = seatOf(view, 'p1');

    expect(seat.tier).toBe('unspied');
    expect(seat.kitHidden).toBe(true);
    expect(seat.avatar).toEqual({ kind: 'initial', initial: 'Z' });
    expect(seat.resources.map((r) => r.kind)).toEqual(['life', 'point', 'upgradePoint', 'shield']);
    expect(valuesOf(seat)).toEqual(['?', '?', '?', '?']);
    expect(seat.reveal).toBeNull();
    expect(seat.badges).toEqual([
      { kind: 'spying-on-you' },
      { kind: 'block', turnsRemaining: 2 },
      {
        kind: 'sentence',
        sentence: { id: 'sentence-1', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false },
      },
      { kind: 'shield', isUpgraded: true }, // presence and tier, never the value
      { kind: 'persistent', effect: poison }, // card lives 2 stay public (L56-06)
    ]); // activeAttackBlock renders nothing (Q36)
    expect(seat.badgeOverflow).toBe(3);
  });

  it('base Spy: live lives, points, upgrade points and shield; kit, hand and specials hidden (Lot 69)', () => {
    const view = makePlayingView({
      players: [
        ME,
        makePlayer('p1', {
          spied: { lives: 7, points: 3, upgradePoints: 1, shield: 2 },
          duplicationActive: true,
        }),
        makePlayer('p2', {
          spied: { lives: 1, points: 0, upgradePoints: 0, shield: 0 },
          drawGain: 14,
        }),
      ],
    });
    const p1 = seatOf(view, 'p1');

    expect(p1.tier).toBe('base-spy');
    expect(p1.kitHidden).toBe(true);
    expect(p1.avatar).toEqual({ kind: 'initial', initial: 'P' });
    expect(valuesOf(p1)).toEqual([7, 3, 1, 2]);
    expect(p1.reveal).toBeNull();
    expect(p1.badges).toEqual([{ kind: 'duplication' }]);
    expect(seatOf(view, 'p2').badges).toEqual([{ kind: 'draw-gain', amount: 14 }]);
  });

  it('Spy+: kit portrait, live resources, hand and specials', () => {
    const view = makePlayingView({
      players: [ME, makePlayer('p1', { spied: FULL_VISION }), makePlayer('p2')],
    });
    const seat = seatOf(view, 'p1');

    expect(seat.tier).toBe('spy-plus');
    expect(seat.kitHidden).toBe(false);
    expect(seat.avatar).toEqual({ kind: 'kit', kitId: 'assassin' });
    expect(valuesOf(seat)).toEqual([9, 4, 1, 3]);
    expect(seat.reveal).toEqual({
      mode: 'spy',
      hand: [makeCard('basic-attack')],
      specialCards: [makeCard('mega-attack')],
    });
  });

  it('eliminated: frozen kit, cards and tokens; only Reanimation and the absorb window; no connection, eye or bot label', () => {
    const view = makePlayingView({
      players: [
        ME,
        makePlayer('p1', {
          isEliminated: true,
          eliminationReveal: makeEliminationReveal({
            kitId: 'ghost',
            hand: [makeCard('thief')],
            points: 5,
            shield: 2,
          }),
          pendingReanimation: { isUpgraded: true },
          absorbWindowOpen: true,
          isBot: true,
          botDifficulty: 'hard',
          connection: connection({ status: 'absent', disconnectedAt: 5, automaticTurnsTaken: 2 }),
          spyingOnYou: true,
          blockTurnsRemaining: 1,
          activeShield: { isUpgraded: false },
        }),
        makePlayer('p2'),
      ],
    });
    const seat = seatOf(view, 'p1');

    expect(seat.tier).toBe('eliminated');
    expect(seat.isEliminated).toBe(true);
    expect(seat.kitHidden).toBe(false);
    expect(seat.avatar).toEqual({ kind: 'kit', kitId: 'ghost' });
    expect(valuesOf(seat)).toEqual([0, 5, 0, 2]);
    expect(seat.reveal).toEqual({
      mode: 'elimination',
      hand: [makeCard('thief')],
      specialCards: [],
    });
    expect(seat.badges).toEqual([{ kind: 'reanimation', isUpgraded: true }, { kind: 'absorb-window' }]);
    expect(seat.connectionLabel).toBeNull();
    expect(seat.botDifficulty).toBeNull();
  });

  it('spectator overlay: a walk-in after Stay watches every seat at Spy+ (L57-16)', () => {
    const view = makePlayingView({
      you: 'watcher',
      isSpectator: true,
      currentTurnPlayerId: 'p0',
      turnOrder: ['p0', 'p1', 'p2'],
      players: ['p0', 'p1', 'p2'].map((id) => makePlayer(id, { spied: FULL_VISION })),
    });
    const list = seatList(view);

    expect(list.pov).toBe('watching');
    expect(list.seats.map((seat) => seat.playerId)).toEqual(['p0', 'p1', 'p2']);
    for (const seat of list.seats) {
      expect([seat.tier, seat.kitHidden, seat.reveal?.mode]).toEqual(['spy-plus', false, 'spy']);
      expect(valuesOf(seat)).toEqual([9, 4, 1, 3]);
    }
  });

  it('spectator overlay: an eliminated POV without Reanimation watches every seat at Spy+ (§6.12)', () => {
    const view = makePlayingView({
      players: [
        makePlayer('me', {
          isYou: true,
          isEliminated: true,
          eliminationReveal: makeEliminationReveal(),
        }),
        makePlayer('p1', { spied: FULL_VISION }),
        makePlayer('p2', { spied: { ...FULL_VISION, kitId: 'gambler' } }),
      ],
      currentTurnPlayerId: 'p1',
    });

    expect(seatList(view).pov).toBe('watching');
    expect(seatList(view).seats.map((s) => [s.playerId, s.tier, s.kitHidden])).toEqual([
      ['p1', 'spy-plus', false],
      ['p2', 'spy-plus', false],
    ]);
    expect(seatOf(view, 'p2').avatar).toEqual({ kind: 'kit', kitId: 'gambler' });
  });

  it('an eliminated seat that also carries spectator spied shows its death reveal, not live values', () => {
    const view = makePlayingView({
      players: [
        makePlayer('me', {
          isYou: true,
          isEliminated: true,
          eliminationReveal: makeEliminationReveal(),
        }),
        makePlayer('p1', {
          isEliminated: true,
          eliminationReveal: makeEliminationReveal({ kitId: 'wizard', points: 6 }),
          spied: {
            kitId: 'wizard',
            hand: [],
            specialCards: [],
            lives: 0,
            points: 0,
            upgradePoints: 0,
            shield: 0,
          },
        }),
        makePlayer('p2', { spied: FULL_VISION }),
      ],
    });
    const seat = seatOf(view, 'p1');

    expect(seat.tier).toBe('eliminated');
    expect(valuesOf(seat)).toEqual([0, 6, 0, 0]);
    expect(seat.reveal).toEqual({ mode: 'elimination', hand: [], specialCards: [] });
  });

  it('never prints the dead pre-Lot-69 resourcesSnapshot (spec v7 §14.1)', () => {
    const view = makePlayingView({
      players: [
        ME,
        makePlayer('p1', {
          spied: {
            resourcesSnapshot: { lives: 12, points: 9, upgradePoints: 2, shield: 4, turnSequence: 3 },
          },
        }),
        makePlayer('p2'),
      ],
    });
    const seat = seatOf(view, 'p1');

    expect(seat.tier).toBe('base-spy');
    expect(valuesOf(seat)).toEqual(['?', '?', '?', '?']);
  });

  it('derives the tier from wire fields only: a resolved Spy in the log does not unfog a seat', () => {
    const view = makePlayingView({
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'me',
          action: 'playCard',
          cardId: 'spy',
          isUpgraded: true,
          targetPlayerId: 'p1',
          turnSequence: 1,
        },
        {
          kind: 'actionResolved',
          effectId: 'e-1',
          sourcePlayerId: 'me',
          targetPlayerId: 'p1',
          cardId: 'spy',
          isUpgraded: true,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 2,
        },
      ],
    });
    const seat = seatOf(view, 'p1');

    expect(seat.tier).toBe('unspied');
    expect(valuesOf(seat)).toEqual(['?', '?', '?', '?']);
  });
});

describe('POV mode (§6.3, §6.12)', () => {
  it('an eliminated POV with pendingReanimation is reanimating and keeps the seated tiers', () => {
    const view = makePlayingView({
      players: [
        makePlayer('me', {
          isYou: true,
          isEliminated: true,
          eliminationReveal: makeEliminationReveal(),
          pendingReanimation: { isUpgraded: false },
        }),
        makePlayer('p1'),
        makePlayer('p2', { spied: { lives: 6, points: 2, upgradePoints: 0, shield: 0 } }),
      ],
    });

    expect(povModeOf(view)).toBe('reanimating');
    expect(seatList(view).pov).toBe('reanimating');
    expect(seatOf(view, 'p1').tier).toBe('unspied');
    expect(valuesOf(seatOf(view, 'p1'))).toEqual(['?', '?', '?', '?']);
    expect(seatOf(view, 'p2').tier).toBe('base-spy');
  });

  it('a walk-in before Stay is fogged: every seat unspied, kit hidden (L57-16)', () => {
    const view = makePlayingView({
      you: 'watcher',
      isSpectator: true,
      claimableSeats: [{ playerId: 'p1', nickname: 'p1' }],
      currentTurnPlayerId: 'p0',
      turnOrder: ['p0', 'p1'],
      players: [
        makePlayer('p0'),
        makePlayer('p1', { connection: connection({ status: 'disconnected', disconnectedAt: 10 }) }),
      ],
    });
    const list = seatList(view);

    expect(list.pov).toBe('walk-in-fogged');
    expect(list.seats.map((s) => [s.tier, s.kitHidden])).toEqual([
      ['unspied', true],
      ['unspied', true],
    ]);
  });

  it('a living seated POV is seated', () => {
    expect(seatList(makePlayingView()).pov).toBe('seated');
  });
});

describe('seat anatomy (§6.2)', () => {
  it('lists every seat but the POV, in view.players order, with its seat-colour index (L39-03)', () => {
    const view = makePlayingView({
      players: [makePlayer('p1'), ME, makePlayer('p2')],
      turnOrder: ['p1', 'me', 'p2'],
    });

    expect(seatList(view).seats.map((s) => [s.playerId, s.nickname, s.seatColorIndex])).toEqual([
      ['p1', 'p1', 0],
      ['p2', 'p2', 2],
    ]);
  });

  it('flags only the seat whose turn it is', () => {
    const view = makePlayingView({ currentTurnPlayerId: 'p2' });

    expect(seatList(view).seats.map((s) => [s.playerId, s.isActive])).toEqual([
      ['p1', false],
      ['p2', true],
    ]);
  });

  it('shows the bot difficulty, hidden in the tutorial (L17-03)', () => {
    const players = [ME, makePlayer('p1', { isBot: true, botDifficulty: 'normal' }), makePlayer('p2')];

    expect(seatList(makePlayingView({ players })).seats.map((s) => s.botDifficulty)).toEqual([
      'normal',
      null,
    ]);
    expect(
      seatList(makePlayingView({ players, playKind: 'tutorial', tutorialIndex: 0 })).seats.map(
        (s) => s.botDifficulty,
      ),
    ).toEqual([null, null]);
  });

  it('shows the connection badge text: grace, absent N/3, idle N/5, none when connected (L10-04)', () => {
    const view = makePlayingView({
      turnOrder: ['me', 'p1', 'p2', 'p3', 'p4'],
      players: [
        ME,
        makePlayer('p1', { connection: connection({ status: 'disconnected', disconnectedAt: 1000 }) }),
        makePlayer('p2', {
          connection: connection({ status: 'absent', disconnectedAt: 1000, automaticTurnsTaken: 2 }),
        }),
        makePlayer('p3', { connection: connection({ consecutiveTimeouts: 1 }) }),
        makePlayer('p4'),
      ],
    });
    const expected = ['disconnected — grace', 'absent 2/3', 'idle timeouts 1/5', null];

    expect(seatList(view).seats.map((s) => s.connectionLabel)).toEqual(expected);
    expect(view.players.filter((p) => !p.isYou).map(connectionLabel)).toEqual(expected);
    expect(
      connectionLabel(
        makePlayer('x', {
          isEliminated: true,
          connection: connection({ status: 'absent', automaticTurnsTaken: 1 }),
        }),
      ),
    ).toBeNull(); // connectionBadgeLabel alone would say 'eliminated'
  });

  it('orders every living status by SEAT_BADGE_KINDS and counts the overflow past two', () => {
    const invisibility = makePersistent({ id: 'inv-1', cardId: 'invisibility', counter: 3 });
    const curse = makePersistent({ id: 'curse-1', cardId: 'curse' });
    const view = makePlayingView({
      players: [
        ME,
        makePlayer('p1', {
          activePersistentEffects: [curse, invisibility],
          activeShield: { isUpgraded: false },
          blockAttacksForbidden: true,
          duplicationActive: true,
          drawGain: 12,
          spyingOnYou: true,
          spied: { lives: 3, points: 1, upgradePoints: 0, shield: 4 },
        }),
        makePlayer('p2'),
      ],
      pendingSentences: [
        { id: 's-1', sourcePlayerId: 'p1', remainingOwnerTurns: 1, isUpgraded: true },
        { id: 's-2', sourcePlayerId: 'p2', remainingOwnerTurns: 3, isUpgraded: false },
      ],
    });
    const seat = seatOf(view, 'p1');

    expect(kindsOf(seat)).toEqual([
      'spying-on-you',
      'block',
      'invisibility',
      'sentence',
      'shield',
      'persistent',
      'duplication',
      'draw-gain',
    ]);
    expect(seat.badges.slice(0, SEAT_VISIBLE_BADGE_COUNT).map((b) => b.kind)).toEqual([
      'spying-on-you',
      'block',
    ]);
    expect(seat.badgeOverflow).toBe(6);
    expect(seat.badges[1]).toEqual({ kind: 'block', turnsRemaining: 0 }); // attack ban, last chain turn
    expect(seat.badges[2]).toEqual({ kind: 'invisibility', effect: invisibility }); // one badge, not also a persistent
    expect(seat.badges[5]).toEqual({ kind: 'persistent', effect: curse });
    expect(seatOf(view, 'p2').badges).toEqual([
      {
        kind: 'sentence',
        sentence: { id: 's-2', sourcePlayerId: 'p2', remainingOwnerTurns: 3, isUpgraded: false },
      },
    ]);
  });

  it('pins the badge kinds and the two visible slots (decisions.md 2026-10-27)', () => {
    expect(SEAT_BADGE_KINDS).toEqual([
      'spying-on-you',
      'block',
      'invisibility',
      'sentence',
      'shield',
      'persistent',
      'duplication',
      'draw-gain',
      'reanimation',
      'absorb-window',
    ]);
    expect(SEAT_VISIBLE_BADGE_COUNT).toBe(2);
    expectTypeOf<SeatBadge['kind']>().toEqualTypeOf<SeatBadgeKind>();
  });

  it('seatColorIndexOf: the view.players position, past the palette too, else 0 (L39-03)', () => {
    const ids = ['me', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const view = makePlayingView({
      players: ids.map((id) => makePlayer(id, { isYou: id === 'me' })),
      turnOrder: ids,
    });

    expect(seatColorIndexOf(view, 'p2')).toBe(2);
    expect(seatColorIndexOf(view, 'p8')).toBe(8);
    expect(seatColorIndexOf(view, 'nobody')).toBe(0);
    expect(seatOf(view, 'p8').seatColorIndex).toBe(8);
  });
});
