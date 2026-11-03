/**
 * Watching strip copy — technical spec v7 §6.12, §7.2, §10.6, §13 (Q24, Q38); Appendix A
 * `walk-in-spectator-mode`, `table-prompts`, `claim-seat-dismiss-stay` (L74-23).
 *
 * The three lines are V2's, verbatim (`screens/table.tsx`): the walk-in's private-zone pair and
 * the eliminated prompt. Which one shows follows the L73 `SelfStripModel` only: kit fog is the
 * server's (L57-16), so the client never infers it (§6.3).
 */

import type { SelfStripModel } from '../../view-model/self-strip';

/** §10.6: the walk-in's control that reopens App's claim picker after Stay (§7.2). */
export const CLAIM_SEAT_LABEL = 'Claim a seat';

/** V2 `screens/table.tsx` private zone: a walk-in once the server grants the Spy overlay (after Stay). */
export const WATCHING_HANDS_VISIBLE_COPY =
  'Watching this table. Hands and kits are visible the same way as an eliminated player.';

/** V2 `screens/table.tsx` private zone (L57-16): a walk-in without the overlay, behind the claim picker. */
export const WATCHING_HANDS_HIDDEN_COPY = 'Hands stay hidden until you stay spectating or sit.';

/** V2 `screens/table.tsx` 'Eliminated' prompt, in full: an eliminated Watching POV. */
export const ELIMINATED_WATCHING_COPY = 'You are a spectator. Actions are locked while rewards (if any) resolve.';

/**
 * The Watching line for this POV, or null when it is not Watching. A walk-in has no kit (Q38), so
 * a Watching POV with a kit is an eliminated seat.
 */
export function watchingCopy(model: SelfStripModel): string | null {
  switch (model.pov) {
    case 'walk-in-fogged':
      return WATCHING_HANDS_HIDDEN_COPY;
    case 'watching':
      return model.kitId === null ? WATCHING_HANDS_VISIBLE_COPY : ELIMINATED_WATCHING_COPY;
    case 'seated':
    case 'reanimating':
      return null;
  }
}
