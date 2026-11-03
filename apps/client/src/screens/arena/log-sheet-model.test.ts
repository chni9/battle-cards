/**
 * Log ticker label and stick rule: technical spec v7 §6.9; Appendix A `table-action-log-panel` (L74-15).
 */
import { describe, expect, it } from 'vitest';

import { log } from '../../view-model/log';
import { makePlayingView } from '../../view-model/test-fixtures';
import { followLogScroll, isNearLogBottom, tickerLabel } from './log-sheet-model';

describe('log sheet model (L74-15)', () => {
  it('names the ticker after the log and its newest line', () => {
    expect(tickerLabel(null)).toBe('Action log: No actions yet');
    const line = log(makePlayingView({ actionLog: [{ kind: 'actionPlayed', actorPlayerId: 'p1', action: 'draw', turnSequence: 1 }] })).ticker;
    expect(tickerLabel(line)).toBe('Action log: p1 draws');
  });

  it('follows new lines only within 48 px of the bottom (V2)', () => {
    expect(isNearLogBottom({ scrollHeight: 900, clientHeight: 300, scrollTop: 553 })).toBe(true);
    expect(isNearLogBottom({ scrollHeight: 900, clientHeight: 300, scrollTop: 552 })).toBe(false);
  });

  it('a scroll event the reader did not make keeps the log stuck, however much it grew (L74-26 gate G27)', () => {
    // Chrome can fire a scroll event after new lines land and before the sheet re-sticks: the
    // scrollTop is where the stick left it, but two lines and a round header put it 96 px up.
    const stuck = { stuck: true, lastTop: 600 };
    expect(followLogScroll(stuck, { scrollHeight: 996, clientHeight: 300, scrollTop: 600 })).toEqual(stuck);
    // The reader scrolls up past 48 px: the log stops following, and a later layout event keeps that.
    const away = followLogScroll(stuck, { scrollHeight: 996, clientHeight: 300, scrollTop: 400 });
    expect(away).toEqual({ stuck: false, lastTop: 400 });
    expect(followLogScroll(away, { scrollHeight: 1100, clientHeight: 300, scrollTop: 400 })).toEqual(away);
    // Back within 48 px of the bottom: it follows again.
    expect(followLogScroll(away, { scrollHeight: 1100, clientHeight: 300, scrollTop: 760 })).toEqual({ stuck: true, lastTop: 760 });
  });
});
