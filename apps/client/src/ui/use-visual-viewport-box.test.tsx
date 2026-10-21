// @vitest-environment happy-dom
/** Visible-box hooks — L53-07, technical spec v7 §6.4. */
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { useViewportMode, useVisualViewportBox } from './use-visual-viewport-box';

type FakeViewport = EventTarget & { width: number; height: number; offsetTop: number; offsetLeft: number };

const STUBBED_KEYS = ['visualViewport', 'innerWidth', 'innerHeight'] as const;
const originals = new Map(STUBBED_KEYS.map((key) => [key, Object.getOwnPropertyDescriptor(window, key)]));
let fake: FakeViewport;

function stubWindow(key: (typeof STUBBED_KEYS)[number], value: unknown): void {
  Object.defineProperty(window, key, { configurable: true, value });
}

function resize(width: number, height: number): void {
  act(() => {
    fake.width = width;
    fake.height = height;
    fake.dispatchEvent(new Event('resize'));
  });
}

function BoxProbe() {
  const { width, height, offsetTop } = useVisualViewportBox();
  return <output data-testid="box">{`${width}x${height}+${offsetTop}`}</output>;
}

function ModeProbe() {
  return <output data-testid="mode">{useViewportMode()}</output>;
}

beforeEach(() => {
  fake = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 });
  stubWindow('visualViewport', fake);
});

afterEach(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor === undefined) Reflect.deleteProperty(window, key);
    else Object.defineProperty(window, key, descriptor);
  }
});

describe('useVisualViewportBox (L53-07)', () => {
  it('reads the visible box on mount', () => {
    renderUi(<BoxProbe />);
    expect(screen.getByTestId('box').textContent).toBe('390x844+0');
  });

  it('follows visualViewport resize and scroll', () => {
    renderUi(<BoxProbe />);
    resize(844, 390);
    expect(screen.getByTestId('box').textContent).toBe('844x390+0');
    act(() => {
      fake.offsetTop = 120;
      fake.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByTestId('box').textContent).toBe('844x390+120');
  });

  it('removes its visualViewport listeners on unmount', () => {
    const removed = vi.spyOn(fake, 'removeEventListener');
    const { unmount } = renderUi(<BoxProbe />);
    unmount();
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['resize', 'scroll']));
  });
});

describe('useViewportMode (technical spec v7 §6.4)', () => {
  it('maps the visible box to a layout mode', () => {
    renderUi(<ModeProbe />);
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
    resize(844, 390);
    expect(screen.getByTestId('mode').textContent).toBe('landscape-compact');
    resize(1440, 900);
    expect(screen.getByTestId('mode').textContent).toBe('desktop');
  });

  it('falls back to the window size when visualViewport is null', () => {
    stubWindow('visualViewport', null);
    stubWindow('innerWidth', 1440);
    stubWindow('innerHeight', 900);
    renderUi(<ModeProbe />);
    expect(screen.getByTestId('mode').textContent).toBe('desktop');
    act(() => {
      stubWindow('innerWidth', 390);
      stubWindow('innerHeight', 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
  });
});
