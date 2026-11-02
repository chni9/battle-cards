/**
 * Elimination reward picks: rules spec §6; technical spec v7 §6.7, §13 Q55; Appendix A
 * `table-subchoice-reward` (L74-18).
 */
import type { RewardChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCard } from '../../../view-model/test-fixtures';
import {
  DEFAULT_REWARD_PICKS, mergeSeenCards, pickRewardCard, pickRewardKind, rewardCardBlock, rewardConfirm, type RewardPicks,
} from './reward-model';

const SPY = makeCard('spy', { instanceId: 'r-spy' });
const THIEF = makeCard('thief', { instanceId: 'r-thief' });
const TAX = makeCard('tax', { instanceId: 'r-tax' });
const PROMPT: RewardChoiceRequiredPayload = {
  kind: 'elimination-reward', eliminationId: 'el-1', eliminatedPlayerId: 'p1', availableCards: [SPY, THIEF], deadlineMs: 1,
};
const BOTH_CARDS: RewardPicks = [{ kind: 'card', cardId: 'r-spy' }, { kind: 'card', cardId: 'r-thief' }];

describe('reward picks (L74-18)', () => {
  it('defaults to lives and points, a valid payload at once (V2)', () => {
    expect(rewardConfirm(PROMPT, DEFAULT_REWARD_PICKS)).toEqual({
      payload: { kind: 'elimination-reward', eliminationId: 'el-1', choices: [{ type: 'lives' }, { type: 'points' }] },
      block: null,
    });
  });

  it('starts a card pick on the first card the other choice does not hold; leaving a card clears it', () => {
    const both = pickRewardKind(pickRewardKind(DEFAULT_REWARD_PICKS, 0, 'card', PROMPT.availableCards), 1, 'card', PROMPT.availableCards);
    expect(both).toEqual(BOTH_CARDS);
    expect(rewardConfirm(PROMPT, both).payload?.choices).toEqual([{ type: 'card', instanceId: 'r-spy' }, { type: 'card', instanceId: 'r-thief' }]);
    expect(pickRewardKind(both, 0, 'lives', PROMPT.availableCards)[0]).toEqual({ kind: 'lives', cardId: null });
  });

  it("greys the other choice's card and a card no longer offered, and refuses the other choice's card (Q55)", () => {
    expect(rewardCardBlock('r-spy', 1, BOTH_CARDS, [SPY, THIEF])).toBe('reward-card-already-chosen');
    expect(rewardCardBlock('r-tax', 1, BOTH_CARDS, [SPY, THIEF])).toBe('reward-card-unavailable');
    expect(rewardCardBlock('r-thief', 1, BOTH_CARDS, [SPY, THIEF])).toBeNull();
    expect(pickRewardCard(BOTH_CARDS, 1, 'r-spy')).toBe(BOTH_CARDS);
  });

  it('blocks Confirm on a pick a refreshed prompt dropped, and keeps a still-offered one', () => {
    const refreshed: RewardChoiceRequiredPayload = { ...PROMPT, availableCards: [SPY] };
    expect(rewardConfirm(refreshed, BOTH_CARDS)).toEqual({ payload: null, block: 'reward-card-unavailable' });
    expect(rewardConfirm(refreshed, pickRewardKind(BOTH_CARDS, 1, 'points', refreshed.availableCards)).payload?.choices)
      .toEqual([{ type: 'card', instanceId: 'r-spy' }, { type: 'points' }]);
  });

  it('remembers every card the prompt offered, in first-seen order', () => {
    const seen = [SPY, THIEF];
    expect(mergeSeenCards(seen, [THIEF, SPY])).toBe(seen);
    expect(mergeSeenCards(seen, [TAX, SPY])).toEqual([SPY, THIEF, TAX]);
  });
});
