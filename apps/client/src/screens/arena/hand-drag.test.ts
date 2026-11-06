/**
 * Drag from the hand, pure helpers: technical spec v7 §6.6.3–§6.6.5, §12.2 (L74-12).
 */
import type { CardInstance, PlayingStateView } from '@card-battle/shared';
import { describe, expect, it, vi } from 'vitest';

import type { ActionContext } from '../../view-model/action-lock';
import { cardActions } from '../../view-model/card-actions';
import { dropTarget, type DropZoneRects, type Rect } from '../../view-model/drop-target';
import { makeCard, makePlayingView, makeSelf } from '../../view-model/test-fixtures';
import type { ArenaCommit } from './arena-commit';
import {
  canStartHandDrag, classifyHandGesture, dispatchDrop, hoveredZoneOf, latestHeldActions,
  plateDropHighlight, resolveDrop, seatDropHighlight, sellZoneRect, SELL_ZONE_SIZE, type DropChoice,
} from './hand-drag';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const ATTACK = makeCard('basic-attack', { instanceId: 'atk-1' });
const TAX = makeCard('tax', { instanceId: 'tax-1' });
const REGEN = makeCard('regeneration', { instanceId: 'regen-1' });
const TRANSFORMER = makeCard('card-transformer', { instanceId: 'tf-1' });
const VIEW: PlayingStateView = makePlayingView({ self: makeSelf({ points: 30, hand: [ATTACK, TAX, REGEN], specialCards: [TRANSFORMER] }) });
const box = (left: number, top: number): Rect => ({ left, top, width: 100, height: 100 });
const RECTS: DropZoneRects = {
  seats: [{ playerId: 'p1', rect: box(0, 0) }, { playerId: 'p2', rect: box(200, 0) }],
  plate: box(100, 200),
  sell: box(300, 400),
};
const SEAT_P1 = { x: 50, y: 50 };
const PLATE = { x: 150, y: 250 };
const SELL = { x: 350, y: 450 };
const OUTSIDE = { x: 999, y: 999 };
const held = (instance: CardInstance, zone: 'hand' | 'special' = 'hand') => cardActions(VIEW, { zone, instance }, LIVE);
/** `commit` reports a send that went out, as the arena's does without a veto. */
function spies() {
  return { commit: vi.fn<ArenaCommit>(() => true), openChoice: vi.fn<(choice: DropChoice) => void>() };
}

describe('gesture and drag start guard (§6.6.5)', () => {
  it.each([
    [{ x: 0, y: 7 }, 'pending'],
    [{ x: 5, y: -9 }, 'lift'],
    [{ x: 3, y: 12 }, 'lift'],
    [{ x: 12, y: 9 }, 'scroll'],
    [{ x: 9, y: 9 }, 'scroll'],
  ] as const)('reads %o as %s', (delta, gesture) => {
    expect(classifyHandGesture(delta)).toBe(gesture);
  });

  it('starts only from a model that can drag, and never while targeting', () => {
    expect(canStartHandDrag(held(ATTACK), false)).toBe(true);
    expect(canStartHandDrag(held(ATTACK), true)).toBe(false);
    const spyNoPoints = makePlayingView({ self: makeSelf({ points: 0, hand: [makeCard('spy', { instanceId: 'spy-1' })] }) });
    // Use is unaffordable, but Sell is open: the Sell zone still takes the card.
    expect(canStartHandDrag(cardActions(spyNoPoints, { zone: 'hand', instance: makeCard('spy', { instanceId: 'spy-1' }) }, LIVE), false)).toBe(true);
  });

  it.each<{ label: string; view: PlayingStateView; ctx: ActionContext }>([
    { label: 'off-turn', view: { ...VIEW, currentTurnPlayerId: 'p1' }, ctx: LIVE },
    { label: 'a sub-choice open', view: VIEW, ctx: { subChoice: { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 }, readOnly: false } },
    { label: 'the finished board', view: VIEW, ctx: { subChoice: null, readOnly: true } },
  ])('never starts a drag $label (actions locked)', ({ view, ctx }) => {
    expect(canStartHandDrag(cardActions(view, { zone: 'hand', instance: ATTACK }, ctx), false)).toBe(false);
  });

  it('never starts a drag while the tutorial tour or Look gate locks the table (L75-04, §6.6.3)', () => {
    expect([canStartHandDrag(held(ATTACK), false, true), canStartHandDrag(held(ATTACK), false, false), canStartHandDrag(held(ATTACK), false)])
      .toEqual([false, true, true]);
  });
});

describe('dispatchDrop maps each dropTarget result (§6.6.3, §6.6.4)', () => {
  it('a valid seat commits playCard with that target', () => {
    const { commit, openChoice } = spies();
    expect(dispatchDrop(dropTarget(SEAT_P1, RECTS, held(ATTACK)), commit, openChoice)).toBe('sent');
    expect(commit.mock.calls).toEqual([[{ kind: 'playCard', payload: { instanceId: 'atk-1', targetPlayerId: 'p1' } }]]);
    expect(openChoice).not.toHaveBeenCalled();
  });

  it('the plate commits an untargeted card with no targetPlayerId key', () => {
    const { commit, openChoice } = spies();
    expect(dispatchDrop(dropTarget(PLATE, RECTS, held(TAX)), commit, openChoice)).toBe('sent');
    expect(commit.mock.calls).toEqual([[{ kind: 'playCard', payload: { instanceId: 'tax-1' } }]]);
    expect(openChoice).not.toHaveBeenCalled();
  });

  it('Regeneration on the plate opens its choice and sends nothing', () => {
    const { commit, openChoice } = spies();
    expect(dispatchDrop(dropTarget(PLATE, RECTS, held(REGEN)), commit, openChoice)).toBe('choice');
    expect(openChoice.mock.calls).toEqual([['regeneration']]);
    expect(commit).not.toHaveBeenCalled();
  });

  it('Card Transformer on the plate opens its consume choice and sends nothing', () => {
    const { commit, openChoice } = spies();
    expect(dispatchDrop(dropTarget(PLATE, RECTS, held(TRANSFORMER, 'special')), commit, openChoice)).toBe('choice');
    expect(openChoice.mock.calls).toEqual([['consume']]);
    expect(commit).not.toHaveBeenCalled();
  });

  it('the Sell zone commits sellCard', () => {
    const { commit } = spies();
    expect(dispatchDrop(dropTarget(SELL, RECTS, held(ATTACK)), commit, vi.fn())).toBe('sent');
    expect(commit.mock.calls).toEqual([[{ kind: 'sellCard', payload: { instanceId: 'atk-1' } }]]);
  });

  it('null sends nothing and returns the card', () => {
    const { commit, openChoice } = spies();
    expect(dropTarget(OUTSIDE, RECTS, held(ATTACK))).toBeNull();
    expect(dispatchDrop(null, commit, openChoice)).toBe('returned');
    expect([commit.mock.calls.length, openChoice.mock.calls.length]).toEqual([0, 0]);
  });

  it('passes the drop context to commit with the intent (L74-17, A.9.3)', () => {
    const { commit, openChoice } = spies();
    const context = { instanceId: 'atk-1', dropPoint: SEAT_P1 };
    expect(dispatchDrop(dropTarget(SEAT_P1, RECTS, held(ATTACK)), commit, openChoice, context)).toBe('sent');
    expect(commit.mock.calls).toStrictEqual([[{ kind: 'playCard', payload: { instanceId: 'atk-1', targetPlayerId: 'p1' } }, context]]);
  });

  it('reports a commit that did not go out as returned, so the card springs back (L74 Part 2 final review)', () => {
    const commit = vi.fn<ArenaCommit>(() => false);
    const openChoice = vi.fn<(choice: DropChoice) => void>();
    expect(dispatchDrop(dropTarget(SEAT_P1, RECTS, held(ATTACK)), commit, openChoice, { instanceId: 'atk-1', dropPoint: SEAT_P1 })).toBe('returned');
    expect(dispatchDrop(dropTarget(SELL, RECTS, held(ATTACK)), commit, openChoice)).toBe('returned');
    expect([commit.mock.calls.length, openChoice.mock.calls.length]).toEqual([2, 0]);
  });
});

describe('a drop resolves against the latest view (Review Focus 4)', () => {
  it('sends nothing once the card left the hand', () => {
    const { commit, openChoice } = spies();
    const latest = latestHeldActions({ ...VIEW, self: makeSelf({ points: 30, hand: [TAX] }) }, LIVE, { kind: 'hand', instance: ATTACK });
    expect(latest).toBeNull();
    expect(dispatchDrop(resolveDrop(SEAT_P1, RECTS, latest), commit, openChoice)).toBe('returned');
    expect(commit).not.toHaveBeenCalled();
  });

  it('sends nothing when the turn passed mid-drag: the latest model cannot drag', () => {
    const { commit, openChoice } = spies();
    const latest = latestHeldActions({ ...VIEW, currentTurnPlayerId: 'p1' }, LIVE, { kind: 'hand', instance: ATTACK });
    expect(latest?.canDrag).toBe(false);
    expect(dispatchDrop(resolveDrop(SEAT_P1, RECTS, latest), commit, openChoice)).toBe('returned');
    expect(commit).not.toHaveBeenCalled();
  });

  it('sends nothing when the connection dropped mid-drag (Part 2 Review Focus 3, L74-25)', () => {
    const { commit, openChoice } = spies();
    const latest = latestHeldActions(VIEW, { ...LIVE, reconnecting: true }, { kind: 'hand', instance: ATTACK });
    expect(latest?.canDrag).toBe(false);
    expect(dispatchDrop(resolveDrop(SEAT_P1, RECTS, latest), commit, openChoice)).toBe('returned');
    expect(commit).not.toHaveBeenCalled();
  });
});

describe('highlights and the Sell zone (§6.6.3)', () => {
  it('names the zone under the pointer', () => {
    expect(hoveredZoneOf(dropTarget(SEAT_P1, RECTS, held(ATTACK)))).toEqual({ kind: 'seat', playerId: 'p1' });
    expect(hoveredZoneOf(dropTarget(PLATE, RECTS, held(TAX)))).toEqual({ kind: 'plate' });
    expect(hoveredZoneOf(dropTarget(PLATE, RECTS, held(REGEN)))).toEqual({ kind: 'plate' });
    expect(hoveredZoneOf(dropTarget(SELL, RECTS, held(ATTACK)))).toEqual({ kind: 'sell' });
    expect(hoveredZoneOf(null)).toBeNull();
  });

  it('lights seats for a targeted card and only the plate for an untargeted one', () => {
    expect(seatDropHighlight(held(ATTACK).drop, { kind: 'seat', playerId: 'p2' })).toEqual({ seatIds: ['p1', 'p2'], overId: 'p2' });
    expect(plateDropHighlight(held(ATTACK).drop, null)).toBeNull();
    expect(seatDropHighlight(held(TAX).drop, null)).toEqual({ seatIds: [], overId: null });
    expect([plateDropHighlight(held(TAX).drop, null), plateDropHighlight(held(TAX).drop, { kind: 'plate' })]).toEqual(['valid', 'over']);
  });

  it('puts the Sell zone above the hand on the side opposite the drag origin', () => {
    const hand: Rect = { left: 0, top: 600, width: 375, height: 140 };
    const top = 600 - SELL_ZONE_SIZE.height - 8;
    expect(sellZoneRect(hand, 60, 375)).toEqual({ left: 375 - 96 - 16, top, width: 96, height: 72 });
    expect(sellZoneRect(hand, 300, 375)).toEqual({ left: 16, top, width: 96, height: 72 });
  });
});
