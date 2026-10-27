// @vitest-environment happy-dom
/**
 * V7 coach panel — the rules of technical spec v7 §6.12 and DESIGN.md › Coach panel that
 * `coach-panel.test.tsx` (the L72-17 acceptance tests) does not reach: the size caps, where the
 * footer controls sit in each layout mode, the keyboard path through the panel, the body that is
 * a region only while it overflows, Escape left to the sheet stack (Q49), and the root
 * attributes a caller cannot override.
 */
import { act, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiResult } from '../../test/render';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { useViewportMode } from '../use-visual-viewport-box';
import { CoachPanel, type CoachPanelProps } from './coach-panel';

// The panel reads only the layout mode, so the mock needs only that hook (a mock must provide
// every hook the rendered tree calls). Without it happy-dom's 1024×768 window is `desktop`.
vi.mock('../use-visual-viewport-box', () => ({ useViewportMode: vi.fn(() => 'portrait') }));
const viewportMode = vi.mocked(useViewportMode);

afterEach(() => {
  viewportMode.mockImplementation(() => 'portrait');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

function coachRoot(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Tax' });
}

function headerOf(root: HTMLElement): HTMLElement {
  const header = within(root).getByRole('heading', { level: 2, name: 'Tax' }).parentElement;
  if (header === null) throw new Error('The coach title has no header row');
  return header;
}

function buttonNames(scope: HTMLElement): (string | null)[] {
  return within(scope)
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);
}

/** happy-dom has no layout: give every element the same scroll and client heights. */
function stubOverflow(scrollHeight: number, clientHeight: number): void {
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

describe('CoachPanel size caps (technical spec v7 §5.3, §6.12)', () => {
  it.each([
    { compact: true, cap: 'max-h-[min(36vh,15rem)]' },
    { compact: false, cap: 'max-h-[min(52vh,28rem)]' },
  ])('caps the panel at $cap (compact $compact)', ({ compact, cap }) => {
    renderPanel({ compact });
    expect(coachRoot().classList.contains(cap)).toBe(true);
  });
});

describe('CoachPanel footer placement (technical spec v7 §6.4, §6.12)', () => {
  it.each(['portrait', 'desktop'] as const)('keeps the footer below the body in %s', (mode) => {
    viewportMode.mockImplementation(() => mode);
    renderPanel();
    const root = coachRoot();
    expect(root.children).toHaveLength(3);
    expect(buttonNames(headerOf(root))).toEqual([HIDE_COACH_ARIA_LABEL]);
    const footer = root.lastElementChild;
    if (!(footer instanceof HTMLElement)) throw new Error('The coach panel has no footer row');
    expect(buttonNames(footer)).toEqual([GOT_IT_ACTION_LABEL]);
  });

  it.each([{ compact: true }, { compact: false }])(
    'moves the footer into the header row, before the close control, in landscape-compact (compact $compact)',
    ({ compact }) => {
      viewportMode.mockImplementation(() => 'landscape-compact');
      renderPanel({ compact, footer: [<button key="a" type="button">{GOT_IT_ACTION_LABEL}</button>, <button key="b" type="button">Skip all</button>] });
      const root = coachRoot();
      expect(root.children).toHaveLength(2);
      expect(buttonNames(headerOf(root))).toEqual([GOT_IT_ACTION_LABEL, 'Skip all', HIDE_COACH_ARIA_LABEL]);
    },
  );

  it('has no footer row and only the close control in the header when there is no footer', () => {
    viewportMode.mockImplementation(() => 'landscape-compact');
    renderPanel({ footer: undefined });
    const root = coachRoot();
    expect(root.children).toHaveLength(2);
    expect(buttonNames(headerOf(root))).toEqual([HIDE_COACH_ARIA_LABEL]);
  });
});

describe('CoachPanel keyboard path (technical spec v7 §6.12)', () => {
  it('tabs from the close control to the footer when the body fits, and never traps focus', async () => {
    const { user } = renderPanel();
    expect(screen.queryByRole('region')).toBeNull();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: HIDE_COACH_ARIA_LABEL }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: GOT_IT_ACTION_LABEL }));
    await user.tab();
    expect(document.activeElement).toBe(document.body);
  });

  it('tabs through the body between the close control and the footer when it overflows', async () => {
    stubOverflow(200, 100);
    const { user } = renderPanel();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: HIDE_COACH_ARIA_LABEL }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Tax' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: GOT_IT_ACTION_LABEL }));
  });
});

describe('CoachPanel body region (DESIGN.md › Overlays › Keyboard scroll)', () => {
  it('is plain, not a region or a Tab stop, while the copy fits', () => {
    renderPanel();
    expect(screen.queryByRole('region')).toBeNull();
    const body = document.querySelector('[data-scroll-axis="y"]');
    expect(body?.hasAttribute('tabindex')).toBe(false);
    expect(body?.hasAttribute('data-scroll-region')).toBe(false);
  });

  it('is a named focusable scroll region, with the ring inside its edge, while the copy overflows', () => {
    stubOverflow(200, 100);
    renderPanel();
    const region = screen.getByRole('region', { name: 'Tax' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.hasAttribute('data-scroll-region')).toBe(true);
    expect(region.textContent).toContain('are your health');
    expect(region.classList.contains('focus-visible:-outline-offset-2')).toBe(true);
  });

  it('becomes a region when it starts to overflow and plain again when it fits, on a resize', () => {
    class FakeResizeObserver {
      static instances: FakeResizeObserver[] = [];
      readonly observe = vi.fn<(target: Element) => void>();
      readonly unobserve = vi.fn<(target: Element) => void>();
      readonly disconnect = vi.fn<() => void>();
      constructor(private readonly callback: ResizeObserverCallback) {
        FakeResizeObserver.instances.push(this);
      }
      resize(): void {
        this.callback([], this);
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const view = renderPanel();
    const [observer] = FakeResizeObserver.instances;
    const body = document.querySelector('[data-scroll-axis="y"]');
    if (observer === undefined || !(body instanceof HTMLElement)) throw new Error('The panel did not observe its body');
    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(observer.observe).toHaveBeenCalledWith(body);
    expect(observer.observe).toHaveBeenCalledWith(body.firstElementChild);
    expect(screen.queryByRole('region')).toBeNull();

    const box = { scrollHeight: 90, clientHeight: 90 };
    Object.defineProperties(body, {
      scrollHeight: { configurable: true, get: () => box.scrollHeight },
      clientHeight: { configurable: true, get: () => box.clientHeight },
    });
    box.scrollHeight = 140;
    act(() => {
      observer.resize();
    });
    expect(screen.getByRole('region', { name: 'Tax' })).toBeInstanceOf(HTMLElement);

    box.scrollHeight = 90;
    act(() => {
      observer.resize();
    });
    expect(screen.queryByRole('region')).toBeNull();

    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
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
    const root = coachRoot();
    expect(root.getAttribute('data-motion')).toBe('full');
    const heading = within(root).getByRole('heading', { level: 2, name: 'Tax' });
    expect(root.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(root.getAttribute('data-hint-id')).toBe('draw');
  });

  it('is a named complementary landmark, not a dialog', () => {
    renderPanel();
    expect(coachRoot().tagName).toBe('ASIDE');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
