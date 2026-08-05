/**
 * The card handler registry — technical spec §4.1.
 *
 * Adding a card means adding its handler file, registering it here, and moving its id from
 * `PENDING_CARD_IDS` to `IMPLEMENTED_CARD_IDS`. It never means touching another card's
 * handler or the engine (see `docs/agent/card-handler.md`).
 */

import type { CardId } from '@card-battle/shared';

import type { CardHandler } from './handler';
import { attackThiefHandler } from './handlers/attack-thief';
import { absorberHandler } from './handlers/absorber';
import { basicAttackHandler } from './handlers/basic-attack';
import { cardAbsorberHandler } from './handlers/card-absorber';
import { cardThiefHandler } from './handlers/card-thief';
import { cardTransformerHandler } from './handlers/card-transformer';
import { cloningHandler } from './handlers/cloning';
import { curseHandler } from './handlers/curse';
import { impositionHandler } from './handlers/imposition';
import { megaAttackHandler } from './handlers/mega-attack';
import { mirrorHandler } from './handlers/mirror';
import { pointsGeneratorHandler } from './handlers/points-generator';
import { poisonHandler } from './handlers/poison';
import { regenerationHandler } from './handlers/regeneration';
import { sentenceHandler } from './handlers/sentence';
import { shieldHandler } from './handlers/shield';
import { spyHandler } from './handlers/spy';
import { spyThiefHandler } from './handlers/spy-thief';
import { strongAttackHandler } from './handlers/strong-attack';
import { suicideHandler } from './handlers/suicide';
import { superAbsorberHandler } from './handlers/super-absorber';
import { superAttackHandler } from './handlers/super-attack';
import { superMirrorHandler } from './handlers/super-mirror';
import { superRegenerationHandler } from './handlers/super-regeneration';
import { taxHandler } from './handlers/tax';
import { thiefHandler } from './handlers/thief';
import { upgradePointThiefHandler } from './handlers/upgrade-point-thief';

/** Cards with a working handler. Grows by one entry per card task. */
export const IMPLEMENTED_CARD_IDS = [
  'basic-attack',
  'strong-attack',
  'super-attack',
  'tax',
  'regeneration',
  'shield',
  'thief',
  'spy',
  'absorber',
  'mirror',
  'imposition',
  'points-generator',
  'suicide',
  'spy-thief',
  'cloning',
  'sentence',
  'super-regeneration',
  'upgrade-point-thief',
  'card-thief',
  'poison',
  'curse',
  'super-absorber',
  'mega-attack',
  'super-mirror',
  'attack-thief',
  'card-absorber',
  'card-transformer',
] as const satisfies readonly CardId[];

export type ImplementedCardId = (typeof IMPLEMENTED_CARD_IDS)[number];

type PendingCardId = Exclude<CardId, ImplementedCardId>;

export const PENDING_CARD_IDS = [
  'block',
  'invisibility',
  'reanimation',
] as const satisfies readonly PendingCardId[];

export const cardHandlers: Record<ImplementedCardId, CardHandler> = {
  'basic-attack': basicAttackHandler,
  'strong-attack': strongAttackHandler,
  'super-attack': superAttackHandler,
  tax: taxHandler,
  regeneration: regenerationHandler,
  shield: shieldHandler,
  thief: thiefHandler,
  spy: spyHandler,
  absorber: absorberHandler,
  mirror: mirrorHandler,
  imposition: impositionHandler,
  'points-generator': pointsGeneratorHandler,
  suicide: suicideHandler,
  'spy-thief': spyThiefHandler,
  cloning: cloningHandler,
  sentence: sentenceHandler,
  'super-regeneration': superRegenerationHandler,
  'upgrade-point-thief': upgradePointThiefHandler,
  'card-thief': cardThiefHandler,
  poison: poisonHandler,
  curse: curseHandler,
  'super-absorber': superAbsorberHandler,
  'mega-attack': megaAttackHandler,
  'super-mirror': superMirrorHandler,
  'attack-thief': attackThiefHandler,
  'card-absorber': cardAbsorberHandler,
  'card-transformer': cardTransformerHandler,
};

const implementedCardIds = new Set<CardId>(IMPLEMENTED_CARD_IDS);

function isImplemented(cardId: CardId): cardId is ImplementedCardId {
  return implementedCardIds.has(cardId);
}

export function findHandler(cardId: CardId): CardHandler | undefined {
  return isImplemented(cardId) ? cardHandlers[cardId] : undefined;
}
