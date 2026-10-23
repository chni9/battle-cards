// @vitest-environment happy-dom
/** V7 component-test harness self-test (technical spec v7 §12.2; L72-06). */
import { screen } from '@testing-library/react';
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { usePrefersReducedMotion } from '../ui/motion/use-prefers-reduced-motion';
import { useSheetStackState, useSheetStackStore } from '../ui/primitives/sheet-stack-context';
import { renderUi, setReducedMotion } from './render';

function MotionProbe() {
  return <p>{usePrefersReducedMotion() ? 'reduced' : 'full'}</p>;
}

function NamedRegion({ children }: { children: ReactNode }) {
  return <section aria-label="Harness wrapper">{children}</section>;
}

describe('renderUi (technical spec v7 §12.2)', () => {
  it('tells React it runs in an act environment, so unwrapped updates warn', () => {
    expect(Reflect.get(globalThis, 'IS_REACT_ACT_ENVIRONMENT')).toBe(true);
  });

  it('returns a user-event instance that drives the rendered tree', async () => {
    const onClick = vi.fn<() => void>();
    const { user } = renderUi(<button type="button" onClick={onClick}>Go</button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('drives user-event under fake timers when advanceTimers is passed', async () => {
    vi.useFakeTimers();
    try {
      const onClick = vi.fn<() => void>();
      const { user } = renderUi(<button type="button" onClick={onClick}>Later</button>, {
        advanceTimers: vi.advanceTimersByTime,
      });
      await user.click(screen.getByRole('button', { name: 'Later' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes RTL render options through (wrapper)', () => {
    renderUi(<p>wrapped</p>, { wrapper: NamedRegion });
    expect(screen.getByRole('region', { name: 'Harness wrapper' }).textContent).toBe('wrapped');
  });
});

describe('reduced-motion stub (technical spec v7 §5.7, §8.3)', () => {
  it('answers the motion query and the reduce query from one persistent list each', () => {
    const plain = window.matchMedia('(prefers-reduced-motion)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const noPreference = window.matchMedia('(prefers-reduced-motion: no-preference)');
    expect(window.matchMedia('(prefers-reduced-motion)')).toBe(plain);
    expect(window.matchMedia('(prefers-reduced-motion: reduce)')).toBe(reduce);
    expect([plain.matches, reduce.matches, noPreference.matches]).toEqual([false, false, true]);
    setReducedMotion(true);
    expect([plain.matches, reduce.matches, noPreference.matches]).toEqual([true, true, false]);
  });

  it('dispatches change once per flip, never on a repeated value', () => {
    const list = window.matchMedia('(prefers-reduced-motion)');
    const onChange = vi.fn<() => void>();
    list.addEventListener('change', onChange);
    setReducedMotion(true);
    setReducedMotion(true);
    setReducedMotion(false);
    list.removeEventListener('change', onChange);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('reports full motion by default', () => {
    renderUi(<MotionProbe />);
    expect(screen.getByText('full').tagName).toBe('P');
  });

  it('reports reduced motion when the render option asks for it', () => {
    renderUi(<MotionProbe />, { reducedMotion: true });
    expect(screen.getByText('reduced').tagName).toBe('P');
  });

  it('flips usePrefersReducedMotion on the next mount, true then false, in one file', () => {
    const first = renderUi(<MotionProbe />);
    expect(first.getByText('full').tagName).toBe('P');
    first.unmount();
    setReducedMotion(true);
    const second = renderUi(<MotionProbe />);
    expect(second.getByText('reduced').tagName).toBe('P');
    second.unmount();
    setReducedMotion(false);
    renderUi(<MotionProbe />);
    expect(screen.getByText('full').tagName).toBe('P');
  });
});

// Run order is declaration order: the second test sees what afterEach left behind.
describe('reset between tests (Vitest globals are off, so RTL does not auto-clean)', () => {
  it('leaves a mounted tree, reduced motion and fake timers on', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    renderUi(<p>left behind</p>);
    expect(screen.getByText('left behind').tagName).toBe('P');
  });

  it('starts the next test with an empty body, full motion and real timers', () => {
    expect(document.body.childElementCount).toBe(0);
    expect(screen.queryByText('left behind')).toBeNull();
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
    expect(vi.isFakeTimers()).toBe(false);
  });
});

function RegistersSheet({ id }: { readonly id: string }): null {
  const store = useSheetStackStore();
  useEffect(() => { store.open({ id, mode: 'read-only' }); return () => { store.close(id); }; }, [store, id]);
  return null;
}
function SheetCount(): ReactElement {
  return <output>{useSheetStackState().entries.length}</output>;
}
it('gives every renderUi call its own sheet stack and keeps it across rerender (L72-09)', () => {
  const first = renderUi(<><RegistersSheet id="card" /><SheetCount /></>);
  expect(first.container.textContent).toBe('1');
  expect(renderUi(<SheetCount />).container.textContent).toBe('0');
  first.rerender(<><RegistersSheet id="card" /><RegistersSheet id="kit" /><SheetCount /></>);
  expect(first.container.textContent).toBe('2');
});
