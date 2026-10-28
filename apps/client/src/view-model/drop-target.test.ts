import type { CardId, PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { cardActions, type CardRef, type DropZones } from './card-actions';
import { dropTarget, type DropZoneRects, type Point } from './drop-target';
import { makeCard, makePending, makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const ON_TURN: ActionContext = { subChoice: null, readOnly: false };
const RECTS: DropZoneRects = {
  seats: [
    { playerId: 'p1', rect: { left: 0, top: 0, width: 100, height: 80 } },
    { playerId: 'p2', rect: { left: 120, top: 0, width: 100, height: 80 } }, // living Invisible
    { playerId: 'c1', rect: { left: 240, top: 0, width: 100, height: 80 } }, // corpse, attack pending on me
    { playerId: 'c4', rect: { left: 360, top: 0, width: 100, height: 80 } }, // corpse, nothing pending on me
  ],
  plate: { left: 100, top: 200, width: 200, height: 120 },
  sell: { left: 0, top: 400, width: 120, height: 60 },
};
const AT = {
  p1: { x: 50, y: 40 },
  p2: { x: 170, y: 40 },
  c1: { x: 290, y: 40 },
  c4: { x: 410, y: 40 },
  plate: { x: 200, y: 260 },
  sell: { x: 60, y: 430 },
  nowhere: { x: 600, y: 600 },
} satisfies Record<string, Point>;

function table(overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makePlayingView({
    turnOrder: ['me', 'p1', 'p2', 'c1', 'c4'],
    players: [
      makePlayer('me', { isYou: true }),
      makePlayer('p1'),
      makePlayer('p2', { activePersistentEffects: [makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 3 })] }),
      makePlayer('c1', { isEliminated: true }),
      makePlayer('c4', { isEliminated: true }),
    ],
    self: makeSelf({ points: 30, hand: [makeCard('basic-attack'), makeCard('shield'), makeCard('regeneration')] }),
    pendingEffects: [makePending({ id: 'fx-c1', sourcePlayerId: 'c1', targetPlayerId: 'me', cardId: 'basic-attack' })],
    ...overrides,
  });
}

const hand = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'hand', instance: makeCard(cardId, { isUpgraded }) });
const special = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'special', instance: makeCard(cardId, { isUpgraded }) });
const drop = (ref: CardRef, at: Point, view = table(), rects = RECTS, ctx = ON_TURN) =>
  dropTarget(at, rects, cardActions(view, ref, ctx));
const play = (instanceId: string, targetPlayerId?: string) => ({
  kind: 'intent',
  intent: { kind: 'playCard', payload: targetPlayerId === undefined ? { instanceId } : { instanceId, targetPlayerId } },
});
const sell = (instanceId: string) => ({ kind: 'intent', intent: { kind: 'sellCard', payload: { instanceId } } });

describe('dropTarget (spec v7 §6.6.3, §6.6.4)', () => {
  it('an attack dropped on a valid seat returns playCard with that target', () => {
    expect(drop(hand('basic-attack'), AT.p1)).toStrictEqual(play('basic-attack-1', 'p1'));
    expect(drop(hand('basic-attack'), AT.c1)).toStrictEqual(play('basic-attack-1', 'c1'));
  });

  it('the same drop on a living Invisible seat or a non-qualifying corpse returns null', () => {
    expect(drop(hand('basic-attack'), AT.p2)).toBeNull();
    expect(drop(hand('basic-attack'), AT.c4)).toBeNull();
  });

  it('MEGA ATTACK on a seat returns null; on the plate it returns playCard with no target', () => {
    expect(drop(special('mega-attack'), AT.p1)).toBeNull();
    expect(drop(special('mega-attack'), AT.plate)).toStrictEqual(play('mega-attack-1'));
  });

  it('Regeneration on the plate opens its choice and sends nothing', () => {
    expect(drop(hand('regeneration'), AT.plate)).toStrictEqual({ kind: 'open-choice', choice: 'regeneration' });
    expect(drop(special('card-transformer'), AT.plate)).toStrictEqual({ kind: 'open-choice', choice: 'consume' });
  });

  it('a special over the Sell zone returns null', () => {
    expect(drop(special('cloning'), AT.sell)).toBeNull();
    expect(drop(hand('shield'), AT.sell)).toStrictEqual(sell('shield-1'));
    expect(drop(hand('basic-attack'), AT.sell)).toStrictEqual(sell('basic-attack-1'));
  });

  it('off-turn no drag starts', () => {
    const offTurn = table({ currentTurnPlayerId: 'p1' });
    expect(cardActions(offTurn, hand('basic-attack'), ON_TURN).canDrag).toBe(false);
    expect(drop(hand('basic-attack'), AT.p1, offTurn)).toBeNull();
  });

  it.each<[string, CardRef, DropZones]>([
    ['a shared attack', hand('basic-attack'), { seatIds: ['p1', 'c1'], plate: null, sell: true }],
    ['MEGA ATTACK', special('mega-attack'), { seatIds: [], plate: 'send', sell: false }],
    ['Regeneration', hand('regeneration'), { seatIds: [], plate: 'regeneration', sell: true }],
    ['Card Transformer', special('card-transformer'), { seatIds: [], plate: 'consume', sell: false }],
    ['Shield', hand('shield'), { seatIds: [], plate: 'send', sell: true }],
    ['an upgraded Card Thief', special('card-thief', true), { seatIds: [], plate: 'send', sell: false }],
    ['Cloning', special('cloning'), { seatIds: ['p1'], plate: null, sell: false }],
  ])('publishes the §6.6.3 drop zones for %s', (_label, ref, zones) => {
    expect(cardActions(table(), ref, ON_TURN).drop).toStrictEqual(zones);
  });

  it('a disabled Use opens no seat or plate, but Sell still takes a hand card', () => {
    const broke = table({ self: makeSelf({ points: 0, hand: [makeCard('basic-attack')] }) });
    const model = cardActions(broke, hand('basic-attack'), ON_TURN);
    expect(model.drop).toStrictEqual({ seatIds: [], plate: null, sell: true });
    expect(model.canDrag).toBe(true);
    expect(drop(hand('basic-attack'), AT.p1, broke)).toBeNull();
    expect(drop(hand('basic-attack'), AT.sell, broke)).toStrictEqual(sell('basic-attack-1'));
  });

  it('canDrag is false while locked, for read-only and in-play cards, and when no zone takes the card', () => {
    const mirrorOpen: ActionContext = { subChoice: { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 0 }, readOnly: false };
    const finished: ActionContext = { subChoice: null, readOnly: true };
    expect(cardActions(table(), hand('basic-attack'), mirrorOpen).canDrag).toBe(false);
    expect(cardActions(table(), hand('basic-attack'), finished).canDrag).toBe(false);
    expect(cardActions(table(), { zone: 'read-only', instance: makeCard('basic-attack') }, ON_TURN).canDrag).toBe(false);
    expect(
      cardActions(table({ self: makeSelf({ shield: 4 }) }), { zone: 'shield', ownerPlayerId: 'me', isUpgraded: false }, ON_TURN).canDrag,
    ).toBe(false);
    expect(cardActions(table({ self: makeSelf({ points: 0 }) }), special('cloning'), ON_TURN).canDrag).toBe(false);
    expect(cardActions(table(), hand('basic-attack'), ON_TURN).canDrag).toBe(true);
  });

  it('an attack over the plate or nowhere returns null', () => {
    expect(drop(hand('basic-attack'), AT.plate)).toBeNull();
    expect(drop(hand('basic-attack'), AT.nowhere)).toBeNull();
  });

  it('returns null inside two valid zones', () => {
    const overlap: DropZoneRects = {
      ...RECTS,
      seats: [
        { playerId: 'p1', rect: { left: 0, top: 0, width: 100, height: 80 } },
        { playerId: 'c1', rect: { left: 50, top: 0, width: 100, height: 80 } },
      ],
    };
    expect(drop(hand('basic-attack'), { x: 75, y: 40 }, table(), overlap)).toBeNull();
    expect(drop(hand('basic-attack'), { x: 25, y: 40 }, table(), overlap)).toStrictEqual(play('basic-attack-1', 'p1'));
  });

  it('returns null inside a valid seat or plate that overlaps a valid Sell zone', () => {
    // A targeted Use opens seats only and an untargeted one the plate only (`dropZonesFor`), so a
    // seat and the plate are never both valid for one card; Sell is the second zone either meets.
    const sellOverSeat: DropZoneRects = { ...RECTS, sell: { left: 0, top: 0, width: 100, height: 80 } };
    expect(drop(hand('basic-attack'), AT.p1, table(), sellOverSeat)).toBeNull();
    const sellOverPlate: DropZoneRects = { ...RECTS, sell: { left: 100, top: 200, width: 200, height: 120 } };
    expect(drop(hand('shield'), AT.plate, table(), sellOverPlate)).toBeNull();
    // A special has no Sell zone, so the same overlap still sends from the plate.
    expect(drop(special('mega-attack'), AT.plate, table(), sellOverPlate)).toStrictEqual(play('mega-attack-1'));
    // A seat over the plate: an attack has no plate zone, so the seat alone takes it.
    const seatOnPlate: DropZoneRects = { ...RECTS, seats: [{ playerId: 'p1', rect: { left: 150, top: 220, width: 60, height: 60 } }] };
    expect(drop(hand('basic-attack'), AT.plate, table(), seatOnPlate)).toStrictEqual(play('basic-attack-1', 'p1'));
  });

  it('treats rects as half-open, so a shared edge belongs to one zone', () => {
    const touching: DropZoneRects = {
      ...RECTS,
      seats: [
        { playerId: 'p1', rect: { left: 0, top: 0, width: 100, height: 80 } },
        { playerId: 'c1', rect: { left: 100, top: 0, width: 100, height: 80 } },
      ],
    };
    expect(drop(hand('basic-attack'), { x: 100, y: 40 }, table(), touching)).toStrictEqual(play('basic-attack-1', 'c1'));
  });

  it('an invalid seat under the pointer wins', () => {
    const onPlate: DropZoneRects = { ...RECTS, seats: [{ playerId: 'p1', rect: { left: 150, top: 220, width: 60, height: 60 } }] };
    expect(drop(special('mega-attack'), AT.plate, table(), onPlate)).toBeNull();
  });

  it('refuses a seat drop for upgraded thieves and sends them from the plate (Appendix A table-use-target-routing)', () => {
    expect(drop(special('card-thief', true), AT.p1)).toBeNull();
    expect(drop(special('card-thief', true), AT.plate)).toStrictEqual(play('card-thief-1'));
  });

  it('drops nowhere on the plate when the plate rect is absent', () => {
    expect(drop(special('mega-attack'), AT.plate, table(), { ...RECTS, plate: null })).toBeNull();
  });

  it('drops nowhere on Sell when the Sell rect is absent', () => {
    expect(cardActions(table(), hand('shield'), ON_TURN).drop.sell).toBe(true);
    expect(drop(hand('shield'), AT.sell, table(), { ...RECTS, sell: null })).toBeNull();
  });
});
