// @vitest-environment happy-dom
/** The tutorial callout layer: technical spec v7 §6.12, §8.3; Lot 75 plan Appendix A.8.6 (L75-04). */
import { waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { Z_INDEX } from '../layers';
import { Sheet } from '../primitives/sheet';
import { TutorialCalloutLayer } from './tutorial-callout';

const TARGET = new DOMRect(100, 600, 80, 120);
afterEach(() => { vi.restoreAllMocks(); });
/** Every marked element reports TARGET, unless `zero` names its id; anything else reports 0×0. */
function stubRects(zero: readonly string[] = []): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect(this: Element) {
    const id = this.getAttribute('data-tutorial-highlight');
    return id === null || zero.includes(id) ? new DOMRect() : TARGET;
  });
}
const drawn = (): (string | null)[] =>
  Array.from(document.querySelectorAll('[data-tutorial-callout]')).map((callout) => callout.getAttribute('data-tutorial-callout'));
const draw = (active = true): ReactElement => (
  <><button type="button" data-tutorial-highlight="draw">Draw</button><TutorialCalloutLayer active={active} /></>
);

describe('TutorialCalloutLayer (spec v7 §6.12, §8.3)', () => {
  it('rings each live, sized target once on the hint layer, with its arrow outside', () => {
    stubRects();
    renderUi(draw());
    expect(drawn()).toEqual(['draw']);
    const callout = document.querySelector('[data-tutorial-callout="draw"]');
    const root = callout?.closest<HTMLElement>('[data-zone="tutorial-callouts"]');
    expect([callout?.getAttribute('data-callout-arrow'), callout?.hasAttribute('data-tutorial-highlight')]).toEqual(['top', false]);
    expect([root?.parentElement === document.body, root?.style.zIndex, root?.style.pointerEvents, root?.getAttribute('aria-hidden')])
      .toEqual([true, String(Z_INDEX.hint), 'none', 'true']);
  });
  it('draws nothing while inactive', () => {
    stubRects();
    renderUi(draw(false));
    expect(document.querySelector('[data-zone="tutorial-callouts"]')).toBeNull();
  });
  it('skips a zero-size target and one inside an inert subtree', () => {
    stubRects(['hand']);
    renderUi(<><div data-tutorial-highlight="hand" /><div inert><button type="button" data-tutorial-highlight="shop">Shop</button></div>{draw()}</>);
    expect(drawn()).toEqual(['draw']);
  });
  it("draws only the live sheet's own targets while a sheet is live", async () => {
    stubRects();
    renderUi(<>{draw()}<Sheet open mode="read-only" placement="bottom" title="Tax" onClose={vi.fn()}><button type="button" data-tutorial-highlight="use">Use</button></Sheet></>);
    await waitFor(() => { expect(drawn()).toEqual(['use']); });
  });
  it('pulses under full motion and stays static under reduced motion (§8.3)', () => {
    stubRects();
    const { unmount } = renderUi(draw());
    expect(document.querySelector('[data-tutorial-callout]')?.getAttribute('data-motion')).toBe('full');
    unmount();
    renderUi(draw(), { reducedMotion: true });
    expect(document.querySelector('[data-tutorial-callout]')?.getAttribute('data-motion')).toBe('reduced');
  });
});
