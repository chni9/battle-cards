/**
 * Table readability copy — technical spec v6 §6.1 / L43-03.
 */

import { describe, expect, it } from 'vitest';

import {
  FELT_QUEUE_TITLE,
  FORFEIT_ACTION_LABEL,
  FORFEIT_ARIA_LABEL,
  FORFEIT_CONFIRM_BODY,
  FORFEIT_CONFIRM_TITLE,
  HIDDEN_KIT_LABEL,
  HOW_TO_PLAY_ARIA_LABEL,
  LEAVE_TABLE_ACTION_LABEL,
  LEAVE_TABLE_ARIA_LABEL,
  LEAVE_TABLE_CONFIRM_TITLE,
  SHOP_PRICE_BLURB,
  STAY_LABEL,
} from './table-copy';

describe('table copy (L43-03 / technical spec v6 §6.1)', () => {
  it('uses Hidden kit, Waiting on others, and double the play cost', () => {
    expect(HIDDEN_KIT_LABEL).toBe('Hidden kit');
    expect(FELT_QUEUE_TITLE).toBe('Waiting on others');
    expect(SHOP_PRICE_BLURB).toContain('double the play cost');
    expect(SHOP_PRICE_BLURB).not.toContain('base play cost');
    expect(SHOP_PRICE_BLURB).not.toMatch(/\bUP\b/);
  });
});

describe('table leave chrome copy (L43-05)', () => {
  it('keeps forfeit and leave-table confirm strings', () => {
    expect(FORFEIT_CONFIRM_TITLE).toBe('Leave the game?');
    expect(FORFEIT_CONFIRM_BODY).toBe('That counts as a forfeit.');
    expect(LEAVE_TABLE_CONFIRM_TITLE).toBe('Leave the table?');
    expect(STAY_LABEL).toBe('Stay');
    expect(FORFEIT_ACTION_LABEL).toBe('Forfeit');
    expect(LEAVE_TABLE_ACTION_LABEL).toBe('Leave');
    expect(FORFEIT_ARIA_LABEL).toBe('Forfeit');
    expect(LEAVE_TABLE_ARIA_LABEL).toBe('Leave table');
    expect(HOW_TO_PLAY_ARIA_LABEL).toBe('How to play');
  });
});
