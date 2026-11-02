/**
 * Log ticker label and stick rule: technical spec v7 §6.9; Appendix A `table-action-log-panel` (L74-15).
 */
import { describe, expect, it } from 'vitest';

import { log } from '../../view-model/log';
import { makePlayingView } from '../../view-model/test-fixtures';
import { isNearLogBottom, tickerLabel } from './log-sheet-model';

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
});
