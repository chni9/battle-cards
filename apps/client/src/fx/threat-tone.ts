/**
 * Classify Incoming threat tone for outline / cue (L39-05).
 * Red/attack: real attack cards + Sentence / Mirror / Super Mirror.
 * Orange/effect: every other new Incoming targeting POV.
 */

import { isAttackCardId } from '@card-battle/shared';

import type { ThreatTone } from './table-fx-types';

/** Non-attack cards that still read as aggressive Incoming (locked L39-05). */
const ATTACK_LIKE_CARD_IDS = new Set<string>(['sentence', 'mirror', 'super-mirror']);

export function threatToneFor(cardId: string): ThreatTone {
  if (isAttackCardId(cardId) || ATTACK_LIKE_CARD_IDS.has(cardId)) {
    return 'attack';
  }
  return 'effect';
}
