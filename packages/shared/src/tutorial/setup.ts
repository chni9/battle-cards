/**
 * Tutorial loadout constants — technical spec v6 §5.3 / designer 2026-08-25.
 * Applied after Classic deal by `applyTutorialSetup` (server). Not on the wire.
 */

import type { CardId } from '../domain/card';
import type { KitId } from '../domain/kit';

export const TUTORIAL_HUMAN_KIT_ID: KitId = 'indestructible';
export const TUTORIAL_BOT_KIT_ID: KitId = 'ghost';

export const TUTORIAL_HUMAN_LIVES = 2;
/** 38 covers Shield (7) at index 17 and still leaves Thief's 10-point steal with enough to finish. */
export const TUTORIAL_HUMAN_POINTS = 38;
export const TUTORIAL_HUMAN_UPGRADE_POINTS = 1;

export const TUTORIAL_BOT_LIVES = 4;
/** Spy 2 + Thief 5 + Strong 2 + Strong 2 + Basic 1, with a small remainder. */
export const TUTORIAL_BOT_POINTS = 16;
export const TUTORIAL_BOT_UPGRADE_POINTS = 0;

export const TUTORIAL_HUMAN_HAND_CARD_IDS: readonly CardId[] = [
  'tax',
  'spy',
  'basic-attack',
  'shield',
  'shield',
];

export const TUTORIAL_HUMAN_SPECIAL_CARD_IDS: readonly CardId[] = ['super-regeneration'];

export const TUTORIAL_BOT_HAND_CARD_IDS: readonly CardId[] = [
  'basic-attack',
  'strong-attack',
  'thief',
  'spy',
];

export const TUTORIAL_BOT_SPECIAL_CARD_IDS: readonly CardId[] = [];
