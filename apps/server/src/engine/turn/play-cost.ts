/**
 * Shared play-cost affordability — technical spec v3 §4.3 rule 4 (L16-01).
 *
 * Catalog `cost.points` is charged in `playCardAction` / multi-attack, not in
 * `canPlay` (Regeneration and Tax are the exceptions: their costs live in handlers.
 * Mirror is charged on sub-choice complete / expiry — playtest 2026-08-09).
 */

import { getCard, type CardId, type Player } from '@card-battle/shared';

export function playPointsCost(cardId: CardId): number {
  return getCard(cardId)?.cost.points ?? 0;
}

export function canAffordPlayPoints(player: Player, cardId: CardId): boolean {
  return player.points >= playPointsCost(cardId);
}
