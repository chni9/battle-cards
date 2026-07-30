/**
 * The card handler registry — technical spec §4.1.
 *
 * Adding a card means adding its handler file, registering it here, and moving its id from
 * `PENDING_CARD_IDS` to `IMPLEMENTED_CARD_IDS`. It never means touching another card's
 * handler or the engine (see `docs/agent/card-handler.md`).
 */

import type { CardId } from '@card-battle/shared';

import type { CardHandler } from './handler';
import { basicAttackHandler } from './handlers/basic-attack';
import { regenerationHandler } from './handlers/regeneration';
import { shieldHandler } from './handlers/shield';
import { strongAttackHandler } from './handlers/strong-attack';
import { superAttackHandler } from './handlers/super-attack';
import { taxHandler } from './handlers/tax';
import { thiefHandler } from './handlers/thief';

/** Cards with a working handler. Grows by one entry per card task. */
export const IMPLEMENTED_CARD_IDS = [
  'basic-attack',
  'strong-attack',
  'super-attack',
  'tax',
  'regeneration',
  'shield',
  'thief',
] as const satisfies readonly CardId[];

export type ImplementedCardId = (typeof IMPLEMENTED_CARD_IDS)[number];

type PendingCardId = Exclude<CardId, ImplementedCardId>;

export const PENDING_CARD_IDS = [
  'spy',
  'absorber',
  'mirror',
  'suicide',
  'spy-thief',
  'imposition',
  'cloning',
  'sentence',
  'points-generator',
] as const satisfies readonly PendingCardId[];

export const cardHandlers: Record<ImplementedCardId, CardHandler> = {
  'basic-attack': basicAttackHandler,
  'strong-attack': strongAttackHandler,
  'super-attack': superAttackHandler,
  tax: taxHandler,
  regeneration: regenerationHandler,
  shield: shieldHandler,
  thief: thiefHandler,
};

const implementedCardIds = new Set<CardId>(IMPLEMENTED_CARD_IDS);

function isImplemented(cardId: CardId): cardId is ImplementedCardId {
  return implementedCardIds.has(cardId);
}

export function findHandler(cardId: CardId): CardHandler | undefined {
  return isImplemented(cardId) ? cardHandlers[cardId] : undefined;
}
