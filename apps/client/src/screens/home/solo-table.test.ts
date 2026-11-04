/** The solo mini table fits a 360 px phone: technical spec v7 §7.1; Lot 76 plan A.10 (L76-11). */
import { SOLO_OPPONENT_COUNTS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { SOLO_TABLE_SEAT_PX, SOLO_TABLE_SEATS, SOLO_TABLE_STAGE, SOLO_TABLE_YOU } from './solo-table';

describe('solo mini table (L76-11)', () => {
  it('keeps seven 44 px seats and You inside a stage no wider than 328 px, each clear of the others', () => {
    expect(SOLO_TABLE_STAGE.width).toBeLessThanOrEqual(328); // a 360 px phone's content width
    const half = SOLO_TABLE_SEAT_PX / 2;
    const centres = [...SOLO_OPPONENT_COUNTS.map((count) => SOLO_TABLE_SEATS[count]), SOLO_TABLE_YOU].map(({ x, y }) => ({
      x: (x / 100) * SOLO_TABLE_STAGE.width,
      y: (y / 100) * SOLO_TABLE_STAGE.height,
    }));
    for (const { x, y } of centres) {
      expect([x - half >= 0, x + half <= SOLO_TABLE_STAGE.width, y - half >= 0, y + half <= SOLO_TABLE_STAGE.height]).toEqual([true, true, true, true]);
    }
    const gaps = centres.flatMap((a, i) => centres.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(SOLO_TABLE_SEAT_PX + 4);
  });
});
