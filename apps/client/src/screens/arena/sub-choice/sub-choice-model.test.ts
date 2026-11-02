/**
 * Sub-choice model: technical spec v7 §6.7; V2 `sub-choice-host.tsx` and `mirror-panel.tsx` (L30-03,
 * L44-03); Appendix A `table-sub-choice-timer-scale` (L74-18).
 */
import type { PlayingStateView, SlotDropChoiceRequiredPayload, SubChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makePending, makePersistent } from '../../../view-model/test-fixtures';
import { makeArenaView } from '../test-view';
import {
  countdownLabel, mirrorOptions, resolvePick, SUB_CHOICE_COPY, subChoiceCountdown, subChoiceExpiryHint, subChoicePromptKey,
} from './sub-choice-model';

/** Me, p1 (Invisible), p2, p3 (eliminated); e1 p1 → me, e2 p2 → me, e3 p1 → p2. */
function mirrorView(): PlayingStateView {
  const base = makeArenaView({ seatCount: 4, tiers: { p3: 'eliminated' }, overrides: { pendingEffects: [
    makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
    makePending({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'strong-attack' }),
    makePending({ id: 'e3', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack' }),
  ] } });
  const invisible = makePersistent({ id: 'inv-p1', cardId: 'invisibility', counter: 3 });
  return { ...base, players: base.players.map((player) => (player.id === 'p1' ? { ...player, activePersistentEffects: [invisible] } : player)) };
}
const drop = (owner: string): SlotDropChoiceRequiredPayload => ({ kind: 'slot-drop', slotOwnerPlayerId: owner, eligibleSlots: [], deadlineMs: 1 });
const reward = (eliminationId: string): SubChoiceRequiredPayload =>
  ({ kind: 'elimination-reward', eliminationId, eliminatedPlayerId: 'p1', availableCards: [], deadlineMs: 1 });

describe('sub-choice model (L74-18)', () => {
  it('titles every kind with the V2 copy, in V2 order', () => {
    expect(Object.entries(SUB_CHOICE_COPY).map(([kind, copy]) => [kind, copy.title])).toEqual([
      ['mirror', 'Mirror redirect'], ['elimination-reward', 'Elimination reward'], ['steal-pick', 'Steal a card'],
      ['pool-pick', 'Recover from pool'], ['special-pick', 'Choose a special'], ['reanimation-kit', 'Choose a kit'],
      ['slot-drop', 'Drop an active card'],
    ]);
  });

  it('names you or the slot owner in the slot-drop expiry hint; other kinds keep the V2 hint', () => {
    const view = makeArenaView();
    expect(subChoiceExpiryHint(drop('me'), view)).toBe('On expiry: your oldest droppable active card is dropped');
    expect(subChoiceExpiryHint(drop('p2'), view)).toBe("On expiry: p2's oldest droppable active card is dropped");
    expect(subChoiceExpiryHint({ kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 }, view)).toBe('On expiry: a random eligible redirect');
    expect(subChoiceExpiryHint(reward('el-1'), view)).toBe('On expiry:');
  });

  it('counts whole seconds against the 40 s window, then says "Time\'s up"', () => {
    expect(subChoiceCountdown(40_000, 0)).toEqual({ secondsLeft: 40, percent: 100 });
    expect(subChoiceCountdown(40_000, 20_500)).toEqual({ secondsLeft: 20, percent: 49 });
    expect(subChoiceCountdown(60_000, 0)).toEqual({ secondsLeft: 60, percent: 100 });
    expect(subChoiceCountdown(40_000, 45_000)).toEqual({ secondsLeft: 0, percent: 0 });
    expect([countdownLabel({ secondsLeft: 12, percent: 30 }), countdownLabel({ secondsLeft: 0, percent: 0 })]).toEqual(['12s left', "Time's up"]);
  });

  it('keeps a pick while it is offered, else falls back to the first offer', () => {
    expect([resolvePick('b', ['a', 'b']), resolvePick('z', ['a', 'b']), resolvePick(null, ['a']), resolvePick('a', [])])
      .toEqual(['b', 'a', 'a', null]);
  });

  it('offers the eligible attacks in wire order and the living opponents, Invisible included', () => {
    const options = mirrorOptions(mirrorView(), { kind: 'mirror', eligibleEffectIds: ['e2', 'e1'], deadlineMs: 1 });
    expect(options.effects.map((effect) => effect.id)).toEqual(['e1', 'e2']);
    expect(options.targetIds).toEqual(['p1', 'p2']);
  });

  it('keys a resend of the same prompt alike and a new elimination apart', () => {
    expect(subChoicePromptKey(reward('el-1'))).toBe(subChoicePromptKey({ ...reward('el-1'), deadlineMs: 9 }));
    expect(subChoicePromptKey(reward('el-1'))).not.toBe(subChoicePromptKey(reward('el-2')));
    expect(subChoicePromptKey(drop('me'))).not.toBe(subChoicePromptKey(drop('p2')));
  });
});
