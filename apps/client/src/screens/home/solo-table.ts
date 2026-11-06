/**
 * The solo mini table: the stage and the seat positions of `SoloOpponentPicker` (technical spec v7
 * §7.1, "opponents 1–7 picked by adding avatars around a mini table"). Lot 76 plan A.10: the count
 * control must fit a 328 px content width, and a seven-option `Segmented` measures about 346 px, so
 * the seats sit on an oval in a stage that never passes 320 px. `solo-table.test.ts` proves every
 * 44 px seat fits and none overlap. L76-11.
 */

import type { SoloOpponentCount } from '@card-battle/shared';

/** A seat centre, in percent of the stage. */
export interface TablePoint {
  readonly x: number;
  readonly y: number;
}

/** The stage box: `w-full max-w-[20rem] aspect-[320/216]`, so it never passes 320 px. */
export const SOLO_TABLE_STAGE = { width: 320, height: 216 } as const;

/** One seat is a 44 px disc (`size-11`): the tap-target floor (spec v7 §5.3). */
export const SOLO_TABLE_SEAT_PX = 44;

/** Bot seats 1..7 clockwise from the bottom-left, on an ellipse (centre 50/50, radii 42 % and 38 %, 45° apart). */
export const SOLO_TABLE_SEATS: Readonly<Record<SoloOpponentCount, TablePoint>> = {
  1: { x: 20.3, y: 76.9 },
  2: { x: 8, y: 50 },
  3: { x: 20.3, y: 23.1 },
  4: { x: 50, y: 12 },
  5: { x: 79.7, y: 23.1 },
  6: { x: 92, y: 50 },
  7: { x: 79.7, y: 76.9 },
};

/** The player's own seat, bottom centre (decorative). */
export const SOLO_TABLE_YOU: TablePoint = { x: 50, y: 88 };
