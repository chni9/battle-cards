// @vitest-environment happy-dom
/**
 * V7 coach panel — the rules of technical spec v7 §6.12 and DESIGN.md › Coach panel that
 * `coach-panel.test.tsx` (the L72-17 acceptance tests) does not reach: the keyboard path through
 * the panel, Escape left to the sheet stack (Q49), and the root attributes a caller cannot
 * override.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiResult } from '../../test/render';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { CoachPanel, type CoachPanelProps } from './coach-panel';

function renderPanel(overrides: Partial<CoachPanelProps> = {}): RenderUiResult {
  return renderUi(
    <CoachPanel
      title="Tax"
      body="Your **lives** are your health. Tax spends **1 life**."
      zone="tutorial-coach"
      onHide={vi.fn<() => void>()}
      hideAriaLabel={HIDE_COACH_ARIA_LABEL}
      footer={<button type="button">{GOT_IT_ACTION_LABEL}</button>}
      {...overrides}
    />,
  );
}

describe('CoachPanel keyboard path (technical spec v7 §6.12)', () => {
  it('names the scrolling body as a focusable region, because the capped panel can overflow', () => {
    renderPanel();
    const region = screen.getByRole('region', { name: 'Tax' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.hasAttribute('data-scroll-region')).toBe(true);
    expect(region.textContent).toContain('are your health');
  });

  it('tabs from the close control through the body to the footer, and never traps focus', async () => {
    const { user } = renderPanel();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: HIDE_COACH_ARIA_LABEL }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Tax' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: GOT_IT_ACTION_LABEL }));
    await user.tab();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('CoachPanel and Escape (Q49)', () => {
  it('neither hides itself nor handles Escape, so the sheet stack keeps it', async () => {
    const onHide = vi.fn<() => void>();
    const reachedDocument = vi.fn<(event: KeyboardEvent) => void>();
    const listening = new AbortController();
    document.addEventListener('keydown', reachedDocument, { signal: listening.signal });
    try {
      const { user } = renderPanel({ onHide });
      await user.tab();
      await user.keyboard('{Escape}');
    } finally {
      listening.abort();
    }
    expect(onHide).not.toHaveBeenCalled();
    const escapes = reachedDocument.mock.calls.map(([event]) => event).filter((event) => event.key === 'Escape');
    expect(escapes).toHaveLength(1);
    expect(escapes[0]?.defaultPrevented).toBe(false);
  });
});

describe('CoachPanel root attributes', () => {
  it('keeps data-motion and aria-labelledby when extraAttrs names them', () => {
    renderPanel({ extraAttrs: { 'data-motion': 'reduced', 'aria-labelledby': 'elsewhere', 'data-hint-id': 'draw' } });
    const root = screen.getByRole('complementary', { name: 'Tax' });
    expect(root.getAttribute('data-motion')).toBe('full');
    const heading = within(root).getByRole('heading', { level: 2, name: 'Tax' });
    expect(root.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(root.getAttribute('data-hint-id')).toBe('draw');
  });

  it('is a named complementary landmark, not a dialog', () => {
    renderPanel();
    expect(screen.getByRole('complementary', { name: 'Tax' }).tagName).toBe('ASIDE');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
