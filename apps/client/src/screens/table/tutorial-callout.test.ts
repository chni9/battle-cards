/**
 * Tutorial callout + hovering coach chrome — technical spec v6 §5.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('tutorial callout chrome (technical spec v6 §5.4)', () => {
  it('defines a pulse animation and pointing arrows', () => {
    const css = readFileSync(join(here, '../../index.css'), 'utf8');
    expect(css).toContain('@keyframes tutorial-pulse');
    expect(css).toContain('@keyframes tutorial-ping');
    expect(css).toContain('tutorial-callout-arrow--top');
    expect(css).not.toContain('inset-top');
    expect(css).toContain('tutorial-callout--threat');
    expect(css).toContain('--color-cta-red');
  });

  it('coach overlay can hide and reopen', () => {
    const src = readFileSync(join(here, 'tutorial-coach.tsx'), 'utf8');
    const panel = readFileSync(
      join(here, '../../design/components/coach-panel.tsx'),
      'utf8',
    );
    expect(src).toContain('onHide');
    expect(src).toContain('onShow');
    expect(src).toContain('OPEN_COACH_ARIA_LABEL');
    expect(src).not.toContain('OPEN_COACH_LABEL');
    expect(src).not.toContain('onSkip');
    expect(src).not.toContain('SKIP_TUTORIAL');
    expect(src).toContain('HIDE_COACH_ARIA_LABEL');
    expect(src).toContain('z-[110]');
    expect(src).toContain('CoachPanel');
    expect(src).toContain('zone="tutorial-coach"');
    expect(panel).toContain('CostDisplay');
    expect(panel).toContain('parseCoachBody');
    expect(src).toContain('?');
    expect(src).toContain('onAck');
    expect(src).toContain('GOT_IT_ACTION_LABEL');
    expect(src).not.toContain('bg-surface-raised');
  });

  it('coach panel is slightly transparent', () => {
    const css = readFileSync(join(here, '../../index.css'), 'utf8');
    expect(css).toContain(
      'color-mix(in srgb, var(--color-surface-raised) 78%, transparent)',
    );
    expect(css).toContain('backdrop-filter');
  });

  it('table wires the board tour and Look gate', () => {
    const table = readFileSync(join(here, '../table.tsx'), 'utf8');
    expect(table).toContain('isTutorialTourActive');
    expect(table).toContain('isTutorialLookPending');
    expect(table).toContain('setPortraitInspected(true)');
    expect(table).toContain('setTourStep');
    expect(table).toContain('overlayLocksTable');
    expect(table).toContain('!readOnly');
  });
});
