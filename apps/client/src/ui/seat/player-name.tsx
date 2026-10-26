/**
 * A nickname painted in its player's seat hue — L39-03 under technical spec v7 §5.1 (the eight
 * `--seat-*` hues) and §5.2 (seat names are Lilita One). L72-19. It replaces
 * `design/components/player-name.tsx` on V7 surfaces; the V2 file stays for the V2 table,
 * lobby and Game over until L74, L76 and L77 switch their imports.
 *
 * - **Seat:** an explicit `seatIndex` (clamped into 0–7) wins, else `seatIndexOf(view,
 *   playerId)` when both are given, else none. An unresolved seat renders the nickname in the
 *   surrounding color, with no `data-seat-index`.
 * - **Color:** inline `v7SeatColor` hex, never `var()` or `color-mix()` (mobile Safari painted
 *   theme variables gray in V2). Every hue clears 4.5:1 on `--panel` and `--panel-2`
 *   (`ui/contrast.test.ts`); at a halo center of the page ground `--seat-1`, `--seat-4` and
 *   `--seat-7` fall to between 3.44:1 and 4.57:1 (DESIGN.md › Seat hues), so a seat name sits on
 *   a panel surface, never straight on `.v7-ground`.
 * - **Own-Hue Rule (§5.1):** the seat hue is on this span only, and a seat hue never shares an
 *   element with `--life` or `--threat-*`. Seat 1 (#ff6461) sits close to `--danger`, so no
 *   state is ever told by this hue alone.
 * - **Possessive:** `'s` follows the colored span as plain text, so only the nickname is colored.
 * - **Long names:** a nickname is at most 24 characters (the server rejects longer ones;
 *   parity `home-nickname`), up to about 320 px in 14 px Lilita One. The span is inline and the
 *   text keeps the full nickname, so a screen reader always hears all of it. A caller that must
 *   clip passes `className="truncate"` and puts the span in a flex row with `min-w-0`
 *   (`truncate` needs a block-level box, which a flex item is). A caller that lets it wrap passes
 *   `className="wrap-anywhere"` (`overflow-wrap: anywhere`), not `break-words`: only `anywhere`
 *   also shrinks the box's min-content width, so an unbroken nickname wraps inside a fit-content
 *   or flex-item box instead of pushing it wider.
 */

import type { ReactElement } from 'react';
import { v7SeatColor } from '../palette';
import { clampSeatIndex, seatIndexOf, type SeatPlayersView } from '../seat-colors';

export interface PlayerNameProps {
  nickname: string;
  /** When set with `view`, resolves seat from `view.players` index. */
  playerId?: string;
  view?: SeatPlayersView;
  /** Explicit seat when `view`/`playerId` are unavailable. */
  seatIndex?: number;
  className?: string;
  /** Possessive form: render `nickname` + `'s` (only nickname is colored). */
  possessive?: boolean;
}

export function PlayerName({
  nickname,
  playerId,
  view,
  seatIndex,
  className = '',
  possessive = false,
}: PlayerNameProps): ReactElement {
  const resolved =
    seatIndex !== undefined
      ? clampSeatIndex(seatIndex)
      : view !== undefined && playerId !== undefined
        ? seatIndexOf(view, playerId)
        : null;

  return (
    <>
      <span
        className={['font-v7-display', className].filter((part) => part !== '').join(' ')}
        {...(resolved !== null ? { style: { color: v7SeatColor(resolved) }, 'data-seat-index': String(resolved) } : {})}
      >
        {nickname}
      </span>
      {possessive ? "'s" : null}
    </>
  );
}
