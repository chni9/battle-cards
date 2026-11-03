/**
 * handFanModel and selectedHandInstanceId: technical spec v7 §5.4 (unplayable), §6.1 item 4
 * (hand order); Appendix A `card-band` (L74-07).
 */
import type { SubChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from '../../view-model/action-lock';
import { DISABLED_REASONS } from '../../view-model/action-reasons';
import { makeCard, makePlayingView, makeSelf, makeTableView } from '../../view-model/test-fixtures';
import { EMPTY_ARENA_SHEETS, openArenaSheet } from './arena-sheets';
import { handFanModel, isCardSpecificUseReason, selectedHandInstanceId } from './hand-fan-model';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };

describe('handFanModel (L74-07)', () => {
  it('orders attacks then actions, each in hand order, and keeps the specials order (§6.1 item 4)', () => {
    const view = makePlayingView({
      self: makeSelf({
        hand: [makeCard('spy'), makeCard('basic-attack'), makeCard('shield'), makeCard('strong-attack')],
        specialCards: [makeCard('poison'), makeCard('block')],
      }),
    });
    const model = handFanModel(view, LIVE);
    expect(model.hand.map((card) => card.source)).toEqual([
      { kind: 'hand', instance: makeCard('basic-attack') },
      { kind: 'hand', instance: makeCard('strong-attack') },
      { kind: 'hand', instance: makeCard('spy') },
      { kind: 'hand', instance: makeCard('shield') },
    ]);
    expect(model.specials.map((card) => card.source)).toEqual([
      { kind: 'special', instance: makeCard('poison') },
      { kind: 'special', instance: makeCard('block') },
    ]);
  });

  it.each(DISABLED_REASONS)('treats %s as card-specific unless it is a lock reason', (reason) => {
    expect(isCardSpecificUseReason(reason)).toBe(reason !== 'not-your-turn' && reason !== 'actions-locked');
  });

  it('marks an unaffordable card unplayable on the POV turn only, with the reason copy', () => {
    const self = makeSelf({ points: 1, hand: [makeCard('basic-attack'), makeCard('strong-attack')] });
    expect(handFanModel(makePlayingView({ self }), LIVE).hand.map((card) => [card.unplayable, card.description]))
      .toEqual([[false, null], [true, 'Not enough points']]);
    const offTurn = handFanModel(makePlayingView({ self, currentTurnPlayerId: 'p1' }), LIVE);
    expect(offTurn.hand.every((card) => !card.unplayable && card.description === null)).toBe(true);
  });

  it('never marks a card unplayable while actions are locked (sub-choice, finished board)', () => {
    const view = makePlayingView({ self: makeSelf({ points: 0, hand: [makeCard('super-attack')] }) });
    for (const ctx of [{ subChoice: MIRROR_OPEN, readOnly: false }, { subChoice: null, readOnly: true }]) {
      expect(handFanModel(view, ctx).hand.map((card) => card.unplayable)).toEqual([false]);
    }
  });

  it('shows no card for a walk-in, whatever the filler self holds (Q38)', () => {
    const view = makeTableView(['me', 'p1', 'p2'], {
      you: 'watcher',
      isSpectator: true,
      self: makeSelf({ hand: [makeCard('spy')], specialCards: [makeCard('poison')] }),
    });
    expect(handFanModel(view, LIVE)).toEqual({ hand: [], specials: [] });
  });
});

describe('selectedHandInstanceId (L74-07)', () => {
  it('is the newest open hand or special card sheet, else null', () => {
    const kit = { kind: 'kit', kitId: 'kamikaze' } as const;
    expect(selectedHandInstanceId(EMPTY_ARENA_SHEETS)).toBeNull();
    expect(selectedHandInstanceId(openArenaSheet(EMPTY_ARENA_SHEETS, kit))).toBeNull();
    const both = openArenaSheet(
      openArenaSheet(EMPTY_ARENA_SHEETS, { kind: 'card', source: { kind: 'special', instance: makeCard('poison') } }),
      { kind: 'card', source: { kind: 'hand', instance: makeCard('spy') } },
    );
    expect(selectedHandInstanceId(both)).toBe('spy-1');
    expect(selectedHandInstanceId(openArenaSheet(both, kit))).toBe('spy-1');
  });
});
