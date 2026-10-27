// @vitest-environment happy-dom
/**
 * `/dev/ui` coach section — technical spec v7 §4.2: every ui/ component appears in the gallery.
 * The entries use the real shared tutorial and hint copy, so these fixtures pin that each one
 * still reaches its own script step (a moved step would silently fall back to the Look copy)
 * and shows the glyphs L72-21 inspects.
 */

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { gallery } from './coach.gallery';

function renderEntry(id: string): HTMLElement {
  const entry = gallery.entries.find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`No ${id} entry`);
  const { container } = renderUi(<>{entry.render()}</>);
  const root = container.querySelector<HTMLElement>('[data-zone]');
  if (root === null) throw new Error(`The ${id} entry draws no coach panel`);
  return root;
}

// The two real-copy tests below pin the shared tutorial script ("1 life", "plus 4 pts"); an L75-01 copy edit must update them.
describe('coach gallery (/dev/ui)', () => {
  it('registers the coach section with the three panels', () => {
    expect(gallery.id).toBe('coach');
    expect(gallery.entries.map((entry) => entry.id)).toEqual(['tutorial-ack', 'tutorial-plain', 'hint-compact']);
  });

  it('draws the Tax tutorial coach with Got it and no Skip', () => {
    const root = renderEntry('tutorial-ack');
    expect(root.getAttribute('data-zone')).toBe('tutorial-coach');
    expect(within(root).getByRole('heading', { level: 2, name: 'Tax' })).toBeInstanceOf(HTMLElement);
    expect(within(root).getByText('1 life')).toBeInstanceOf(HTMLElement);
    expect(within(root).getByRole('button', { name: GOT_IT_ACTION_LABEL })).toBeInstanceOf(HTMLElement);
    expect(screen.queryByRole('button', { name: /skip/i })).toBeNull();
  });

  it('draws the Thief follow-up coach with the plus 4 points gain and no footer', () => {
    const root = renderEntry('tutorial-plain');
    expect(within(root).getByRole('heading', { level: 2, name: 'Tax' })).toBeInstanceOf(HTMLElement);
    expect(within(root).getByText('plus 4 pts')).toBeInstanceOf(HTMLElement);
    expect(within(root).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      HIDE_COACH_ARIA_LABEL,
    ]);
  });

  it('draws the Draw hint compact with Got it and Skip all', () => {
    const root = renderEntry('hint-compact');
    expect(root.getAttribute('data-zone')).toBe('first-game-hint');
    expect(root.getAttribute('data-hint-id')).toBe('draw');
    expect(within(root).getByRole('heading', { level: 2, name: 'Draw' })).toBeInstanceOf(HTMLElement);
    expect(
      within(root)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent),
    ).toEqual([HIDE_COACH_ARIA_LABEL, GOT_IT_ACTION_LABEL, 'Skip all']);
  });
});
