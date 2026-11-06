// @vitest-environment happy-dom
/** useArenaLayoutBox: spec v7 §6.4 (the visible box picks the mode; the arena sizes the seats), L74-04. */
import { act, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { useArenaLayoutBox } from './use-arena-layout-box';

/** happy-dom's ResizeObserver never fires, so the test fires it by hand (as `ui/chat/chat-log.test.tsx` does). */
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

const originalViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
let rect = { width: 0, height: 0 };
let fake: EventTarget & { width: number; height: number; offsetTop: number; offsetLeft: number };

beforeEach(() => {
  fake = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, rect.width, rect.height));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeResizeObserver.instances = [];
  rect = { width: 0, height: 0 };
  if (originalViewport === undefined) Reflect.deleteProperty(window, 'visualViewport');
  else Object.defineProperty(window, 'visualViewport', originalViewport);
});

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const { viewport, arena } = useArenaLayoutBox(ref);
  return (
    <div ref={ref}>
      <output data-testid="box">{`${viewport.width}x${viewport.height} ${arena.width}x${arena.height}`}</output>
    </div>
  );
}

function onlyObserver(): FakeResizeObserver {
  const [observer] = FakeResizeObserver.instances;
  if (observer === undefined) throw new Error('the hook observed nothing');
  return observer;
}

describe('useArenaLayoutBox (§6.4)', () => {
  it('reads the visible viewport, and a 0×0 arena before the region has a size', () => {
    renderUi(<Probe />);
    expect(screen.getByTestId('box').textContent).toBe('390x844 0x0');
  });

  it('follows the arena region when its ResizeObserver fires', () => {
    renderUi(<Probe />);
    expect(onlyObserver().observe).toHaveBeenCalledTimes(1);
    rect = { width: 360, height: 320 };
    act(() => {
      onlyObserver().resize();
    });
    expect(screen.getByTestId('box').textContent).toBe('390x844 360x320');
  });

  it('disconnects its observer on unmount', () => {
    const { unmount } = renderUi(<Probe />);
    unmount();
    expect(onlyObserver().disconnect).toHaveBeenCalledTimes(1);
  });
});

function EditingProbe() {
  const ref = useRef<HTMLDivElement>(null);
  const { viewport } = useArenaLayoutBox(ref);
  return (
    <div ref={ref}>
      <output data-testid="box">{`${viewport.width}x${viewport.height}`}</output>
      <input aria-label="Message" />
      <input aria-label="Ready" type="checkbox" />
    </div>
  );
}
function setVisible(width: number, height: number): void {
  act(() => { fake.width = width; fake.height = height; fake.dispatchEvent(new Event('resize')); });
}

describe('useArenaLayoutBox keyboard hold (ruling 7)', () => {
  it('holds the viewport while a text field has focus, and follows it on blur', async () => {
    const { user } = renderUi(<EditingProbe />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    await user.click(field);
    setVisible(390, 420);
    expect(screen.getByTestId('box').textContent).toBe('390x844');
    act(() => { field.blur(); });
    expect(screen.getByTestId('box').textContent).toBe('390x420');
  });

  it('a focused checkbox holds nothing: only text entry raises a keyboard', async () => {
    const { user } = renderUi(<EditingProbe />);
    await user.click(screen.getByRole('checkbox', { name: 'Ready' }));
    setVisible(844, 390);
    expect(screen.getByTestId('box').textContent).toBe('844x390');
  });
});
