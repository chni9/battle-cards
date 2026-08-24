/**
 * Shop-style choice tile chrome — L44-01 / technical spec v6 §6.4.
 */

import { describe, expect, it } from 'vitest';

import { CHOICE_SELECTED_ORANGE, choiceTileClassName, choiceTileSelectedStyle } from './choice-tile-chrome';

describe('choiceTileClassName (L44-01)', () => {
  it('matches shop selected and idle ring fragments', () => {
    const selected = choiceTileClassName({ selected: true });
    const idle = choiceTileClassName({ selected: false });

    expect(selected).toContain(
      'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
    );
    expect(selected).toContain('border-cta-orange bg-surface ring-2 ring-cta-orange/40');
    expect(idle).toContain('border-border-soft bg-surface hover:border-border');
    expect(idle).not.toContain('border-cta-orange');
  });

  it('fades disabled and unaffordable tiles like the shop', () => {
    expect(choiceTileClassName({ selected: false, faded: true })).toContain('opacity-55');
    expect(choiceTileClassName({ selected: false, disabled: true })).toContain(
      'cursor-not-allowed',
    );
    expect(choiceTileClassName({ selected: false, disabled: true })).toContain('opacity-55');
  });

  it('paints the selected ring inline so seat wash cannot hide it', () => {
    const style = choiceTileSelectedStyle({
      borderColor: '#1d6fd8',
      boxShadow: 'inset 0 3px 0 0 #1d6fd8',
    });
    expect(style.borderColor).toBe(CHOICE_SELECTED_ORANGE);
    expect(String(style.boxShadow)).toContain(CHOICE_SELECTED_ORANGE);
    expect(String(style.boxShadow)).toContain('inset 0 3px 0 0 #1d6fd8');
  });
});
