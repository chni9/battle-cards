/**
 * Buy a random special for 20 points — rules spec §5, L5-09, L21-01 / #V4-29.
 * Draws from all 20 `SPECIAL_CARD_IDS` (pending-handler specials may be granted).
 */

import {
  SPECIAL_CARD_IDS,
  type CardInstance,
  type GameState,
} from '@card-battle/shared';

import { acquireSpecialCard } from '../kits/acquire-card';
import type { Rng } from '../rng';
import { findPlayer } from '../turn/advance-turn';

export const SPECIAL_CARD_PURCHASE_COST = 20;

export type BuySpecialCardResult =
  | { ok: true; instance: CardInstance }
  | { ok: false; message: string };

export function buySpecialCard(
  state: GameState,
  actorPlayerId: string,
  rng: Rng,
): BuySpecialCardResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  if (actor.points < SPECIAL_CARD_PURCHASE_COST) {
    return { ok: false, message: 'Not enough points.' };
  }

  actor.points -= SPECIAL_CARD_PURCHASE_COST;
  actor.turnLedger.pointsSpent += SPECIAL_CARD_PURCHASE_COST;

  const cardId = rng.pick(SPECIAL_CARD_IDS);
  const instance = acquireSpecialCard(
    actor,
    cardId,
    `buy-special:${actor.id}:${String(state.turnSequence)}:${String(actor.specialCards.length)}`,
  );
  return { ok: true, instance };
}
