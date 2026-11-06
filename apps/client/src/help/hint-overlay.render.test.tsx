// @vitest-environment happy-dom
/**
 * HintOverlay on the V7 coach chrome — technical spec v7 §6.12 (a compact translucent panel next to
 * `data-hint-anchor`), §4.2 (rebuilt on `ui/`); L46-01, L46-02; Appendix A `first-game-hint-host`;
 * classification rows 90, 91 and 93 (L75-06). The old-table reads stay in `hint-overlay.test.ts`.
 */
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { hintAnchorId, hintPlacePrefer, type HintId } from '../ui/hint-ids';
import { CoachBody } from '../ui/coach/coach-panel';
import { Z_INDEX } from '../ui/layers';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../view-model/table-copy';
import { HINT_COPY, INCOMING_THIEF_HINT_BODY, SKIP_ALL_HINTS_LABEL } from './hint-copy';
import { HintOverlay } from './hint-overlay';
import { placeHintCard } from './place-hint-card';

function one(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
function addAnchor(id: string, rect: DOMRect): void {
  const node = document.createElement('div');
  node.setAttribute('data-hint-anchor', id);
  document.body.append(node);
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(rect);
}
function setup(hintId: HintId, dialogOpen = false) {
  const onGotIt = vi.fn<() => void>();
  const onSkipAll = vi.fn<() => void>();
  return { onGotIt, onSkipAll, ...renderUi(<HintOverlay hintId={hintId} dialogOpen={dialogOpen} onGotIt={onGotIt} onSkipAll={onSkipAll} />) };
}

/** The text a CoachBody renders for `text` (glyphs and bold markers included), for comparison. */
function coachText(text: string): string | null {
  const probe = renderUi(<CoachBody text={text} />);
  const value = probe.container.textContent;
  probe.unmount();
  return value;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const node of document.querySelectorAll('[data-hint-anchor]')) node.remove();
});

describe('HintOverlay (§6.12, L46-01, L46-02)', () => {
  it('shows body in place of the HINT_COPY body, under the same title (L75-07)', () => {
    renderUi(<HintOverlay hintId="incoming-thief" dialogOpen={false} onGotIt={vi.fn()} onSkipAll={vi.fn()} body={INCOMING_THIEF_HINT_BODY['card-thief']} />);
    const card = screen.getByRole('complementary', { name: HINT_COPY['incoming-thief'].title });
    expect(card.querySelector('p')?.textContent).toBe(coachText(INCOMING_THIEF_HINT_BODY['card-thief']));
  });

  it('is a non-modal card: Got it and × call onGotIt, Skip all calls onSkipAll, no toggle, no focus taken', async () => {
    const { user, onGotIt, onSkipAll } = setup('draw');
    const card = screen.getByRole('complementary', { name: HINT_COPY.draw.title });
    expect([card.getAttribute('data-zone'), card.getAttribute('data-hint-id'), screen.queryByRole('dialog'), document.activeElement])
      .toEqual(['first-game-hint', 'draw', null, document.body]);
    const buttons = within(card).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual([HIDE_COACH_ARIA_LABEL, GOT_IT_ACTION_LABEL, SKIP_ALL_HINTS_LABEL]);
    expect([one('[data-hint-ack="got-it"]').getAttribute('data-variant'), one('[data-hint-ack="skip-all"]').getAttribute('data-variant')]).toEqual(['primary', 'quiet']);
    for (const button of buttons) await user.click(button);
    expect([onGotIt.mock.calls.length, onSkipAll.mock.calls.length]).toEqual([2, 1]);
  });

  it('renders nothing while dialogOpen', () => {
    setup('draw', true);
    expect([document.querySelector('[data-hint-layer]'), document.querySelector('[data-zone="first-game-hint"]')]).toEqual([null, null]);
  });

  it('portals one pointer-transparent layer to document.body on Z_INDEX.hint; only the card takes presses', () => {
    setup('draw');
    const layer = one('[data-hint-layer]');
    expect([layer.parentElement, layer.style.zIndex, layer.classList.contains('pointer-events-none'), one('[data-hint-slot]').classList.contains('pointer-events-auto')])
      .toEqual([document.body, String(Z_INDEX.hint), true, true]);
  });

  it.each(['draw', 'hand', 'incoming-thief'] as const)('places %s next to its first visible anchor', (id) => {
    addAnchor(hintAnchorId(id), new DOMRect(0, 0, 0, 0)); // mounted at zero size: skipped
    const rect = new DOMRect(150, 300, 90, 40);
    addAnchor(hintAnchorId(id), rect);
    setup(id);
    const slot = one('[data-hint-slot]');
    const placed = placeHintCard(rect, { width: slot.offsetWidth, height: slot.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }, { prefer: hintPlacePrefer(id) });
    expect([slot.style.top, slot.style.left]).toEqual([`${String(placed.top)}px`, `${String(placed.left)}px`]);
  });

  it('falls back to the bottom-left corner when no anchor is rendered', () => {
    setup('shop');
    const slot = one('[data-hint-slot]');
    expect([slot.style.left, slot.style.bottom]).toEqual(['0.5rem', '7.5rem']);
  });
});
