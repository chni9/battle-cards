/**
 * The card handler registry — technical spec §4.1.
 *
 * Adding a card means adding its handler file, registering it here, and moving its id from
 * `PENDING_CARD_IDS` to `IMPLEMENTED_CARD_IDS`. It never means touching another card's
 * handler or the engine (see `docs/agent/card-handler.md`).
 *
 * The two lists exist because the 16 cards of technical spec §2 land across lots 1 to 5,
 * so a registry keyed on the full `CardId` union would be a lie for most of the project.
 * Instead the registry is keyed on what is actually implemented, and the two lists are held
 * to cover the union exactly: `PENDING_CARD_IDS` stops compiling once an id it still holds
 * becomes implemented, and `registry.test.ts` catches an id missing from both lists.
 */

import type { CardId } from '@card-battle/shared';

import type { CardHandler } from './handler';

/** Cards with a working handler. Grows by one entry per card task. */
export const IMPLEMENTED_CARD_IDS = [] as const satisfies readonly CardId[];

export type ImplementedCardId = (typeof IMPLEMENTED_CARD_IDS)[number];

type PendingCardId = Exclude<CardId, ImplementedCardId>;

/**
 * Cards still to implement, with the lot that brings them. Shrinks as the lists above and
 * below trade an id. This is the project's ledger of what is missing, enforced by the
 * compiler rather than by a comment.
 */
export const PENDING_CARD_IDS = [
  // Lot 1 (basic attack) and lot 2 (the other two attacks)
  'basic-attack',
  'strong-attack',
  'super-attack',
  // Lot 3 — action cards
  'tax',
  'regeneration',
  'shield',
  'thief',
  'spy',
  'absorber',
  'mirror',
  // Lot 5 — special cards
  'suicide',
  'spy-thief',
  'imposition',
  'cloning',
  'sentence',
  'points-generator',
] as const satisfies readonly PendingCardId[];

/**
 * One handler per implemented card. Keyed on `ImplementedCardId`, so the compiler refuses
 * an entry for a card that is not declared implemented, and refuses a declared card with
 * no entry.
 */
export const cardHandlers: Record<ImplementedCardId, CardHandler> = {};

const implementedCardIds = new Set<CardId>(IMPLEMENTED_CARD_IDS);

function isImplemented(cardId: CardId): cardId is ImplementedCardId {
  return implementedCardIds.has(cardId);
}

/**
 * The handler for a card, or `undefined` while that card is still pending. Callers must
 * reject the action in that case — playing an unimplemented card is not a crash.
 */
export function findHandler(cardId: CardId): CardHandler | undefined {
  return isImplemented(cardId) ? cardHandlers[cardId] : undefined;
}
