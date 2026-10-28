/**
 * Bot seat marker words — technical spec v3 §6, §7 (L17-03); the arena seat `title` (L74-04,
 * designer answer Q1). The same words as the `BotSeatLabel` chip.
 */

import { BOT_DIFFICULTIES } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';
import { botSeatLabelParts, botSeatLabelText } from './bot-seat-label-text';

describe('botSeatLabelText (L17-03)', () => {
  it('reads "Bot · {Easy|Normal|Hard}"', () => {
    expect(BOT_DIFFICULTIES.map((difficulty) => botSeatLabelText(difficulty))).toEqual(['Bot · Easy', 'Bot · Normal', 'Bot · Hard']);
  });

  it('joins the two parts the chip paints', () => {
    expect(botSeatLabelParts('normal')).toEqual({ word: 'Bot', tier: 'Normal' });
  });
});
