// @vitest-environment happy-dom
import { act, fireEvent, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Dialog } from './dialog';

function zone(root: ParentNode, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-zone="${name}"]`);
  if (element === null) { throw new Error(`missing data-zone="${name}"`); }
  return element;
}
function overlayOf(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) { throw new Error('dialog has no sheet overlay'); }
  return overlay;
}
class FakeVisualViewport extends EventTarget { offsetTop = 0; offsetLeft = 0; width = 0; height = 0; }
function stubVisualViewport(width: number, height: number): FakeVisualViewport {
  const viewport = new FakeVisualViewport();
  viewport.width = width;
  viewport.height = height;
  vi.stubGlobal('visualViewport', viewport);
  return viewport;
}
const noop = (): void => undefined;
const panelOf = (name: string): HTMLElement => screen.getByRole('dialog', { name });

describe('Dialog (spec v7 §7.7, L53-02 / L53-07)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('bounds the panel to an 844×390 landscape box and keeps the footer outside the scrolling body', () => {
    stubVisualViewport(844, 390);
    renderUi(<Dialog open title="How to play" onClose={noop} actions={<button type="button">Close</button>}>
      {Array.from({ length: 40 }, (_, index) => <p key={index}>Rule line {index + 1}</p>)}</Dialog>);
    const panel = panelOf('How to play');
    const overlay = overlayOf(panel);
    expect([overlay.style.position, overlay.style.width, overlay.style.height]).toEqual(['fixed', '844px', '390px']);
    expect(panel.style.maxHeight).toBe('100%');
    expect(panel.getAttribute('data-sheet-placement')).toBe('bottom');
    const [body, footer] = [zone(panel, 'sheet-body'), zone(panel, 'sheet-actions')];
    expect(body.className).toContain('overflow-y-auto');
    expect(footer.parentElement).toBe(panel);
    expect(body.contains(footer)).toBe(false);
    expect(footer.contains(screen.getByRole('button', { name: 'Close' }))).toBe(true);
  });
  it('follows visualViewport offsets when the keyboard opens on a 390×844 phone', () => {
    const viewport = stubVisualViewport(390, 844);
    renderUi(<Dialog open title="Feedback" onClose={noop}><input aria-label="Message" /></Dialog>);
    const overlay = overlayOf(panelOf('Feedback'));
    expect(overlay.style.top).toMatch(/^0(px)?$/);
    expect(overlay.style.height).toBe('844px');
    act(() => { viewport.offsetTop = 120; viewport.height = 480; viewport.dispatchEvent(new Event('resize')); });
    expect(overlay.style.top).toBe('120px');
    expect(overlay.style.left).toMatch(/^0(px)?$/);
    expect([overlay.style.width, overlay.style.height]).toEqual(['390px', '480px']);
    expect(overlay.getAttribute('style') ?? '').not.toMatch(/dvh|vh|inset/);
    expect(overlay.className).not.toMatch(/\binset-0\b|dvh/);
  });
  it('is a bottom sheet capped at min(28rem, 100%) on a phone', () => {
    stubVisualViewport(390, 844);
    renderUi(<Dialog open title="Feedback" onClose={noop}><p>Body</p></Dialog>);
    expect(panelOf('Feedback').getAttribute('data-sheet-placement')).toBe('bottom');
    expect(panelOf('Feedback').style.maxWidth).toMatch(/^min\(28rem,\s?100%\)$/);
  });
  it('is centered on a 1440×900 desktop box and honors the 3xl width', () => {
    stubVisualViewport(1440, 900);
    renderUi(<Dialog open title="Shop" width="3xl" onClose={noop}><p>Cards</p></Dialog>);
    expect(panelOf('Shop').getAttribute('data-sheet-placement')).toBe('center');
    expect(panelOf('Shop').style.maxWidth).toMatch(/^min\(48rem,\s?100%\)$/);
  });
  it('ignores the backdrop but keeps Esc when closeOnBackdrop is false', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Dialog open title="Table rules" closeOnBackdrop={false} onClose={onClose}><p>Rules</p></Dialog>);
    await user.click(overlayOf(panelOf('Table rules')));
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('passes the hint anchor and data attributes through to the panel', () => {
    renderUi(<Dialog open title="Choose a reward" hintAnchor="elimination-reward" dataAttributes={{ 'data-sub-choice': 'reward' }} onClose={noop}><p>Pick</p></Dialog>);
    expect(panelOf('Choose a reward').getAttribute('data-hint-anchor')).toBe('elimination-reward');
    expect(panelOf('Choose a reward').getAttribute('data-sub-choice')).toBe('reward');
  });
});

function ClosingDialog({ onClose }: { readonly onClose: () => void }): ReactElement {
  const [open, setOpen] = useState(true);
  return <Dialog open={open} title="Shop" onClose={() => { onClose(); setOpen(false); }}><p>Cards</p></Dialog>;
}
/** happy-dom has no layout: make every sheet body report more content than it shows. */
function stubOverflowingBody(): void {
  const isBody = (element: HTMLElement): boolean => element.getAttribute('data-zone') === 'sheet-body';
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) { return isBody(this) ? 2000 : 0; });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) { return isBody(this) ? 300 : 0; });
}
const rules = Array.from({ length: 40 }, (_, index) => <p key={index}>Rule line {index + 1}</p>);

describe('Dialog fix round 1', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('makes an overflowing text-only body a named scroll region in the Tab cycle (A2, WCAG 2.1.1)', async () => {
    stubOverflowingBody();
    const { user } = renderUi(<Dialog open title="How to play" width="3xl" onClose={noop} actions={<button type="button">Close</button>}>{rules}</Dialog>);
    const panel = panelOf('How to play');
    const body = zone(panel, 'sheet-body');
    const close = screen.getByRole('button', { name: 'Close' });
    expect([body.getAttribute('role'), body.tabIndex]).toEqual(['region', 0]);
    expect(body.getAttribute('aria-labelledby')).toBe(panel.getAttribute('aria-labelledby'));
    expect(screen.getByRole('region', { name: 'How to play' })).toBe(body);
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(document.activeElement).toBe(body);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(body);
  });
  it('keeps a body that fits out of the Tab order', () => {
    renderUi(<Dialog open title="Feedback" onClose={noop}><p>Short</p></Dialog>);
    const body = zone(panelOf('Feedback'), 'sheet-body');
    expect([body.hasAttribute('tabindex'), body.hasAttribute('role')]).toEqual([false, false]);
  });
  it('closes once on a double backdrop click and shields the page while it fades (A3, P9d; fix round 2)', async () => {
    const onClose = vi.fn();
    const onPagePress = vi.fn();
    const { user } = renderUi(<><button type="button" onClick={onPagePress}>Shop</button><ClosingDialog onClose={onClose} /></>);
    const panel = panelOf('Shop');
    const overlay = overlayOf(panel);
    await user.dblClick(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPagePress).not.toHaveBeenCalled();
    // happy-dom has no hit testing: the browser routes a press at this point to the topmost
    // hit-testable box, which is the exiting overlay (fixed over the whole box, not inert, not
    // pointer-events: none); only its panel is inert.
    expect(overlay.isConnected).toBe(true);
    expect([overlay.style.position, overlay.style.pointerEvents, overlay.hasAttribute('inert')]).toEqual(['fixed', '', false]);
    expect([overlay.getAttribute('aria-hidden'), panel.hasAttribute('inert')]).toEqual(['true', true]);
  });
  it('closes once on a double backdrop click under reduced motion (A3, P12b)', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<ClosingDialog onClose={onClose} />, { reducedMotion: true });
    const overlay = overlayOf(panelOf('Shop'));
    await user.click(overlay);
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
