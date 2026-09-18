import { describe, expect, it } from 'vitest';

import {
  durationBucketId,
  fillCombatOutcomes,
  fillHoursUtc,
  fillOccupancyCounts,
  fillPlayedActions,
  fillSeatWinShare,
  rematchRate,
  safeRatio,
  winnerLivesBucketId,
} from './overview-series';

describe('overview series buckets (L62-03 / technical spec v6 §15)', () => {
  it('classifies duration on the published edges', () => {
    expect(durationBucketId(0)).toBe('under5min');
    expect(durationBucketId(5 * 60_000 - 1)).toBe('under5min');
    expect(durationBucketId(5 * 60_000)).toBe('from5to15min');
    expect(durationBucketId(15 * 60_000 - 1)).toBe('from5to15min');
    expect(durationBucketId(15 * 60_000)).toBe('from15to30min');
    expect(durationBucketId(30 * 60_000 - 1)).toBe('from15to30min');
    expect(durationBucketId(30 * 60_000)).toBe('over30min');
  });

  it('classifies winner leftover lives', () => {
    expect(winnerLivesBucketId(1)).toBe('1to5');
    expect(winnerLivesBucketId(5)).toBe('1to5');
    expect(winnerLivesBucketId(6)).toBe('6to10');
    expect(winnerLivesBucketId(10)).toBe('6to10');
    expect(winnerLivesBucketId(11)).toBe('11to15');
    expect(winnerLivesBucketId(15)).toBe('11to15');
    expect(winnerLivesBucketId(16)).toBe('16plus');
    expect(winnerLivesBucketId(25)).toBe('16plus');
  });

  it('fills occupancy 2–8 with zeros', () => {
    expect(fillOccupancyCounts([{ occupancy: 4, gameCount: 3 }])).toEqual([
      { occupancy: 2, gameCount: 0 },
      { occupancy: 3, gameCount: 0 },
      { occupancy: 4, gameCount: 3 },
      { occupancy: 5, gameCount: 0 },
      { occupancy: 6, gameCount: 0 },
      { occupancy: 7, gameCount: 0 },
      { occupancy: 8, gameCount: 0 },
    ]);
  });

  it('fills 24 UTC hours', () => {
    const hours = fillHoursUtc([{ hour: 9, gameCount: 2 }]);
    expect(hours).toHaveLength(24);
    expect(hours[0]).toEqual({ hour: 0, gameCount: 0 });
    expect(hours[9]).toEqual({ hour: 9, gameCount: 2 });
    expect(hours[23]).toEqual({ hour: 23, gameCount: 0 });
  });

  it('returns null rematch rate when there are no games', () => {
    expect(rematchRate(0, 0)).toBeNull();
    expect(rematchRate(2, 4)).toBe(0.5);
    expect(safeRatio(1, 0)).toBeNull();
  });

  it('fills every played action and seat index with zeros', () => {
    const actions = fillPlayedActions([{ action: 'draw', count: 4 }]);
    expect(actions).toHaveLength(13);
    expect(actions.find((row) => row.action === 'draw')?.count).toBe(4);
    expect(actions.find((row) => row.action === 'playCard')?.count).toBe(0);
    const seats = fillSeatWinShare([{ seatIndex: 0, wins: 2, gameCount: 5 }]);
    expect(seats).toHaveLength(8);
    expect(seats[0]).toEqual({ seatIndex: 0, wins: 2, gameCount: 5 });
    expect(seats[7]).toEqual({ seatIndex: 7, wins: 0, gameCount: 0 });
  });

  it('fills combat outcomes including zeros', () => {
    expect(fillCombatOutcomes([{ outcome: 'applied', count: 3 }])).toEqual([
      { outcome: 'applied', count: 3 },
      { outcome: 'immune', count: 0 },
      { outcome: 'cancelled', count: 0 },
      { outcome: 'blocked', count: 0 },
    ]);
  });
});
