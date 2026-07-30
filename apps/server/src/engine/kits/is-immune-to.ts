/**
 * Kit `immuneTo` trait — technical spec §4.5, rules spec §4 (Untouchable).
 * Checked at resolve time (L4-03), not at play time.
 */

import { getKit, type CardId, type Player } from '@card-battle/shared';

export function isImmuneTo(player: Player, cardId: CardId): boolean {
  return getKit(player.kitId).traits.immuneTo.includes(cardId);
}
