// @vitest-environment happy-dom
/**
 * BotSeatLabel — technical spec v3 §6, §7 (L17-03: the bot marker is visible to every
 * recipient) and V7 §5.2 (11 px floor for functional text). Today's copy: "Bot · Easy",
 * "Bot · Normal", "Bot · Hard".
 */

import { BOT_DIFFICULTIES, type BotDifficulty } from '@card-battle/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { BotSeatLabel } from './bot-seat-label';

/** The markup of one glyph, so a test can tell which icon the label drew. */
function glyphOf(name: IconName): string {
  const { container, unmount } = renderUi(<Icon name={name} size={12} />);
  const markup = container.querySelector('svg')?.innerHTML ?? '';
  unmount();
  return markup;
}

function rootOf(container: HTMLElement): Element {
  const root = container.firstElementChild;
  if (root === null) {
    throw new Error('Nothing was rendered');
  }
  return root;
}

const LABELS: Record<BotDifficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

describe('BotSeatLabel (V7 · L17-03)', () => {
  it.each(BOT_DIFFICULTIES)('reads "Bot · %s" with a decorative dot and icon', (difficulty) => {
    const root = rootOf(renderUi(<BotSeatLabel difficulty={difficulty} />).container);
    expect(root.textContent).toBe(`Bot·${LABELS[difficulty]}`);
    expect(root.getAttribute('aria-label')).toBeNull();
    expect(screen.getByText('Bot').closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText(LABELS[difficulty]).closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('·').getAttribute('aria-hidden')).toBe('true');
    const svg = root.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.innerHTML).toBe(glyphOf('bot'));
  });

  // happy-dom has no real colors here, so the tone is pinned by its classes (DESIGN.md › Seat identity).
  it.each(BOT_DIFFICULTIES)('puts the %s label on --panel with --text-2 words and a --text tier', (difficulty) => {
    const root = rootOf(renderUi(<BotSeatLabel difficulty={difficulty} />).container);
    expect(root.classList.contains('bg-v7-panel')).toBe(true);
    expect(root.classList.contains('text-v7-text-2')).toBe(true);
    expect(screen.getByText(LABELS[difficulty]).classList.contains('text-v7-text')).toBe(true);
  });

  it('passes className to the root', () => {
    const { container } = renderUi(<BotSeatLabel difficulty="hard" className="shrink-0" />);
    expect(rootOf(container).classList.contains('shrink-0')).toBe(true);
  });
});
