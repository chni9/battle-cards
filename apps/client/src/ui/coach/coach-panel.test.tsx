// @vitest-environment happy-dom
/** V7 coach panel — technical spec v7 §6.12, §8.3; parity `table-tutorial-coach`, `table-first-game-hints`.
 * Panel half of the classified tutorial-callout "coach overlay can hide and reopen" row (§12.1). */
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions, type RenderUiResult } from '../../test/render';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { CoachBody, CoachPanel, type CoachPanelProps } from './coach-panel';

type Overrides = Partial<Omit<CoachPanelProps, 'hideAriaLabel'>>;
function renderPanel(overrides: Overrides = {}, options: RenderUiOptions = {}): RenderUiResult {
  return renderUi(
    <CoachPanel title="Tax" body="Play Tax." zone="tutorial-coach" onHide={vi.fn<() => void>()}
      hideAriaLabel={HIDE_COACH_ARIA_LABEL} {...overrides} />,
    options,
  );
}
function coachRoot(zone: string): HTMLElement {
  const root = document.querySelector<HTMLElement>(`[data-zone="${zone}"]`);
  if (root === null) throw new Error(`no coach root with data-zone="${zone}"`);
  return root;
}
function onlyMatch(scope: HTMLElement, selector: string): HTMLElement {
  const matches = scope.querySelectorAll<HTMLElement>(selector);
  expect(matches).toHaveLength(1);
  return matches.item(0);
}
const TUTORIAL_ATTRS = { 'data-tutorial-index': '1', 'data-tutorial-coach-open': 'true' };
const ROOT_ATTR_CASES: readonly { zone: string; compact: boolean; extraAttrs: Record<string, string> }[] = [
  { zone: 'first-game-hint', compact: true, extraAttrs: { 'data-hint-id': 'draw' } },
  { zone: 'tutorial-coach', compact: false, extraAttrs: TUTORIAL_ATTRS },
];

describe('CoachPanel (technical spec v7 §6.12)', () => {
  it('renders bold markers as strong text and drops the ** markers', () => {
    renderPanel({ title: 'Draw', body: '**Draw** gives you **points**. Draw once.', zone: 'first-game-hint', compact: true });
    const root = coachRoot('first-game-hint');
    const strongs = root.querySelectorAll('strong');
    expect(strongs).toHaveLength(2);
    expect(strongs.item(0).textContent).toBe('Draw');
    expect(strongs.item(1).querySelector('[data-coach-resource="point"]')?.textContent).toBe('points');
    expect(root.textContent).not.toContain('**');
    expect(root.textContent).toContain('gives you');
    expect(root.textContent).toContain('Draw once.');
  });

  it('renders numbered resource words as cost glyphs with spoken text', () => {
    renderPanel({ body: 'Tax spends **1 life** and gives you **+4 points**. You keep **2 upgrade points** and **3 shield points**.' });
    const root = coachRoot('tutorial-coach');
    const expected = [
      { resource: 'life', spoken: '1 life' },
      { resource: 'point', spoken: 'plus 4 pts' },
      { resource: 'upgradePoint', spoken: '2 upgrade points' },
      { resource: 'shield', spoken: '3 shield points' },
    ] as const;
    for (const { resource, spoken } of expected) {
      const glyph = onlyMatch(root, `[data-coach-resource="${resource}"]`);
      expect(within(glyph).getByText(spoken)).toBeInstanceOf(HTMLElement);
      expect(glyph.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(glyph.closest('strong')).not.toBeNull();
    }
    expect(root.textContent).not.toContain('**');
  });

  it('renders bare resource words as the word plus a decorative icon', () => {
    renderPanel({ body: 'Your **lives** are your health. A Shield does not stop that.' });
    const root = coachRoot('tutorial-coach');
    const lives = onlyMatch(root, '[data-coach-resource="life"]');
    expect(lives.textContent).toBe('lives');
    expect(lives.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(lives.closest('strong')).not.toBeNull();
    const shield = onlyMatch(root, '[data-coach-resource="shield"]');
    expect(shield.textContent).toBe('Shield');
    expect(shield.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(shield.closest('strong')).toBeNull();
  });

  it('calls onHide from the labelled close control', async () => {
    const onHide = vi.fn<() => void>();
    const { user } = renderPanel({ onHide });
    const hide = screen.getByRole('button', { name: HIDE_COACH_ARIA_LABEL });
    expect(hide.textContent).not.toContain('×');
    expect(hide.querySelector('svg')).not.toBeNull();
    await user.click(hide);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('renders the footer slot', async () => {
    const onAck = vi.fn<() => void>();
    const { user } = renderPanel({
      title: 'Your zone',
      body: 'This dock is **your zone**.',
      footer: <button type="button" data-tutorial-ack="got-it" onClick={onAck}>{GOT_IT_ACTION_LABEL}</button>,
    });
    const ack = within(coachRoot('tutorial-coach')).getByRole('button', { name: GOT_IT_ACTION_LABEL });
    expect(ack.getAttribute('data-tutorial-ack')).toBe('got-it');
    await user.click(ack);
    expect(onAck).toHaveBeenCalledTimes(1);
  });

  it('renders only the hide control without a footer', () => {
    renderPanel();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([HIDE_COACH_ARIA_LABEL]);
  });

  it('is a non-modal hovering panel with no Skip control', () => {
    renderPanel({ extraAttrs: TUTORIAL_ATTRS, footer: <button type="button">{GOT_IT_ACTION_LABEL}</button> });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    const root = coachRoot('tutorial-coach');
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-modal')).toBeNull();
    expect(screen.queryByRole('button', { name: /skip/i })).toBeNull();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      HIDE_COACH_ARIA_LABEL,
      GOT_IT_ACTION_LABEL,
    ]);
  });

  it.each(ROOT_ATTR_CASES)('puts data-zone and extra attributes on the root ($zone)', ({ zone, compact, extraAttrs }) => {
    renderPanel({ title: 'Draw', body: 'Draw once.', zone, compact, extraAttrs });
    const root = coachRoot(zone);
    for (const [name, value] of Object.entries(extraAttrs)) expect(root.getAttribute(name)).toBe(value);
    expect(root.getAttribute('data-motion')).not.toBeNull();
    const heading = within(root).getByRole('heading', { level: 2, name: 'Draw' });
    expect(root.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('marks the full-motion entrance by default', () => {
    renderPanel();
    expect(coachRoot('tutorial-coach').getAttribute('data-motion')).toBe('full');
  });

  it('skips the enter animation under reduced motion', () => {
    renderPanel({}, { reducedMotion: true });
    const root = coachRoot('tutorial-coach');
    expect(root.getAttribute('data-motion')).toBe('reduced');
    expect(root.style.opacity).not.toBe('0');
    expect(root.style.transform).not.toMatch(/translate|scale/);
  });
});

describe('CoachBody', () => {
  it('renders parsed copy without panel chrome', () => {
    const { container } = renderUi(<CoachBody text="Tax spends **1 life**." />);
    expect(container.querySelector('h2')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('strong [data-coach-resource="life"]')).not.toBeNull();
    expect(screen.getByText('1 life')).toBeInstanceOf(HTMLElement);
  });
});
