import type { AdminGameDetail, AdminGameElimination } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeGameDetail } from '../screens/admin/admin-fixtures';
import {
  eliminationReasonLabel,
  eliminatorNickname,
  formatMinutesFromMs,
  formatNullablePercent,
  formatThinkMs,
  gameModeLabel,
  gameNotesLabel,
  kitDisplayName,
} from './admin-present';
import { DEFAULT_ADMIN_FILTERS, filtersToQuery, overviewQuery } from './filter-query';

describe('admin-present', () => {
  it('formats duration in minutes', () => {
    expect(formatMinutesFromMs(90_000)).toBe('1.5 min');
    expect(formatMinutesFromMs(null)).toBe('—');
  });

  it('formats think time in seconds', () => {
    expect(formatThinkMs(1500)).toBe('1.5 s');
    expect(formatThinkMs(null)).toBe('—');
    expect(formatNullablePercent(0.5)).toBe('50.0%');
    expect(formatNullablePercent(null)).toBe('—');
  });

  it('formats non-finite numbers as em dash', () => {
    expect(formatMinutesFromMs(Number.NaN)).toBe('—');
    expect(formatThinkMs(Number.NaN)).toBe('—');
    expect(formatNullablePercent(Number.NaN)).toBe('—');
  });

  it('uses catalog kit names', () => {
    expect(kitDisplayName('kamikaze')).toBe('Kamikaze');
  });

  it('labels gambling eliminations (L64-04)', () => {
    expect(eliminationReasonLabel('gambling')).toBe('Gambling');
    expect(eliminationReasonLabel('combat')).toBe('Combat');
  });
});

describe('match detail labels (L80-07)', () => {
  const eliminationBy = (eliminatorPlayerId: string | null): AdminGameElimination => ({
    orderIndex: 0,
    playerId: 'p2',
    nickname: 'Bob',
    eliminatorPlayerId,
    reason: 'combat',
  });
  const detail: AdminGameDetail = makeGameDetail();

  it('labels the classic mode and returns an unknown mode raw', () => {
    expect(gameModeLabel('classic')).toBe('Classic');
    expect(gameModeLabel('team')).toBe('team');
  });

  it('names the eliminator only when it resolves to a seat', () => {
    expect(eliminatorNickname(detail, eliminationBy('p1'))).toBe('Ana');
    expect(eliminatorNickname(detail, eliminationBy(null))).toBeNull();
    expect(eliminatorNickname(detail, eliminationBy('p-gone'))).toBeNull();
  });

  it('names no eliminator whose seat has no nickname', () => {
    const anonymous = makeGameDetail({
      seats: detail.seats.map((seat) => (seat.playerId === 'p1' ? { ...seat, nickname: null } : seat)),
    });
    expect(eliminatorNickname(anonymous, eliminationBy('p1'))).toBeNull();
  });

  it('lists the notes of a match as the Matches list does', () => {
    expect(gameNotesLabel({ hasBots: false, isTutorial: false })).toBe('—');
    expect(gameNotesLabel({ hasBots: true, isTutorial: false })).toBe('Bots');
    expect(gameNotesLabel({ hasBots: false, isTutorial: true })).toBe('Tutorial');
    expect(gameNotesLabel({ hasBots: true, isTutorial: true })).toBe('Bots · Tutorial');
  });
});

describe('overviewQuery (L62-06)', () => {
  it('omits actors=both and sends humans', () => {
    expect(filtersToQuery(DEFAULT_ADMIN_FILTERS)['actors']).toBeUndefined();
    expect(overviewQuery(DEFAULT_ADMIN_FILTERS, 'both')['actors']).toBeUndefined();
    expect(overviewQuery(DEFAULT_ADMIN_FILTERS, 'humans')['actors']).toBe('humans');
  });
});
