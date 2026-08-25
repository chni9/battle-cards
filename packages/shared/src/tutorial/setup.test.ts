import { describe, expect, it } from 'vitest';

import { getKit } from '../domain/kit-catalog';
import {
  TUTORIAL_BOT_HAND_CARD_IDS,
  TUTORIAL_BOT_KIT_ID,
  TUTORIAL_HUMAN_HAND_CARD_IDS,
  TUTORIAL_HUMAN_KIT_ID,
  TUTORIAL_HUMAN_SPECIAL_CARD_IDS,
} from './setup';

describe('tutorial loadout constants (technical spec v6 §5.3 / designer 2026-08-25)', () => {
  it('human kit catalog special is Super Regeneration', () => {
    expect(getKit(TUTORIAL_HUMAN_KIT_ID).specialCards).toEqual(['super-regeneration']);
    expect(TUTORIAL_HUMAN_SPECIAL_CARD_IDS).toEqual(['super-regeneration']);
  });

  it('human hand has one Basic and no Absorber', () => {
    expect(TUTORIAL_HUMAN_HAND_CARD_IDS.filter((id) => id === 'basic-attack')).toHaveLength(1);
    expect(TUTORIAL_HUMAN_HAND_CARD_IDS).not.toContain('absorber');
  });

  it('bot holds Spy, Strong, Thief, and Basic for the scripted plays', () => {
    expect(TUTORIAL_BOT_KIT_ID).toBe('ghost');
    expect(TUTORIAL_BOT_HAND_CARD_IDS).toEqual([
      'basic-attack',
      'strong-attack',
      'thief',
      'spy',
    ]);
  });
});
