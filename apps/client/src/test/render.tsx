/**
 * Shared render helper for client component tests (technical spec v7 §4.5, §12.2; L72-06).
 *
 * Importing this module installs, once per test file: a `window.matchMedia` stub that makes
 * the reduced-motion preference scriptable, the `jest`, `IS_REACT_ACT_ENVIRONMENT` and
 * `Animation.cancel` shims below, and an `afterEach` that unmounts every tree, resets that
 * preference and restores real timers. Vitest runs without globals here, so RTL never
 * registers its own cleanup. Every `.test.tsx` opens with `// @vitest-environment happy-dom`.
 */
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { cleanup, render } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { userEvent } from '@testing-library/user-event';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, vi } from 'vitest';
import { createSheetStackStore } from '../ui/primitives/sheet-stack-context';
import { SheetStackProvider } from '../ui/primitives/sheet-stack-provider';

if (typeof window === 'undefined') {
  throw new Error(
    'src/test/render.tsx needs a DOM: open the test file with // @vitest-environment happy-dom',
  );
}

let reducedMotion = false;
const stubbedLists = new Map<string, MediaQueryList>();
const happyDomMatchMedia = window.matchMedia.bind(window);

/** Answer for the reduced-motion queries the stub owns; `undefined` for every other query. */
function answerFor(key: string): ((reduced: boolean) => boolean) | undefined {
  switch (key) {
    // `motion` asks for '(prefers-reduced-motion)' with no value; CSS uses ': reduce'.
    case '(prefers-reduced-motion)':
    case '(prefers-reduced-motion:reduce)':
      return (reduced) => reduced;
    case '(prefers-reduced-motion:no-preference)':
      return (reduced) => !reduced;
    default:
      return undefined;
  }
}

window.matchMedia = (query: string): MediaQueryList => {
  const key = query.replace(/\s+/g, '').toLowerCase();
  const answer = answerFor(key);
  if (answer === undefined) return happyDomMatchMedia(query);
  const cached = stubbedLists.get(key);
  if (cached !== undefined) return cached;
  const list = Object.defineProperty(happyDomMatchMedia(query), 'matches', {
    get: () => answer(reducedMotion),
  });
  stubbedLists.set(key, list);
  return list;
};

/**
 * Flip the reduced-motion preference. `motion` reads the query once per mount, so the new
 * value reaches components mounted after this call, not ones already on screen.
 */
export function setReducedMotion(reduce: boolean): void {
  if (reduce === reducedMotion) return;
  reducedMotion = reduce;
  for (const list of stubbedLists.values()) list.dispatchEvent(new Event('change'));
}

// RTL's async drain advances fake clocks only when it sees a global `jest` (v7 §12.2). This
// global relies on Vitest's per-file isolation: each test file gets a fresh module graph and
// global scope, so the shim never leaks into a node test. Never set `test.isolate: false`.
Reflect.set(globalThis, 'jest', {
  advanceTimersByTime: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },
});

// happy-dom rejects `Animation.finished` when an animation is cancelled without marking the
// promise handled, so every motion animation that an unmount or a new target interrupts
// reports an unhandled AbortError. Browsers mark it handled (Web Animations, "cancel an
// animation"); this wraps `cancel` on the class happy-dom's `Element.animate` builds to do the
// same. (`window.Animation` is a Vitest getter onto that class, so it cannot be replaced.)
const animationPrototype: object = window.Animation.prototype;
const nativeCancel: unknown = Reflect.get(animationPrototype, 'cancel');
if (typeof nativeCancel === 'function') {
  Reflect.set(animationPrototype, 'cancel', function cancel(this: Animation): void {
    this.finished.catch(() => undefined);
    Reflect.apply(nativeCancel, this, []);
  });
}

// RTL sets this in its own `beforeAll`, which never registers without Vitest globals. Without
// it React drops its "not wrapped in act(...)" warnings, so an unawaited update goes unseen.
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

afterEach(() => {
  cleanup();
  setReducedMotion(false);
  vi.useRealTimers();
});

export interface RenderUiOptions extends Omit<RenderOptions, 'queries'> {
  reducedMotion?: boolean;
  /** Pass `vi.advanceTimersByTime` when the test uses fake timers. */
  advanceTimers?: (delay: number) => unknown;
}

export interface RenderUiResult extends RenderResult {
  user: UserEvent;
}

/**
 * Each call gets its own sheet stack (L72-09): the app shares one module-level store, so
 * without this a sheet left open by one render would sit above the next render's sheets. The
 * wrapper is created per call and RTL reuses it on `rerender`, so the store survives it. A
 * caller's own `wrapper` renders inside the provider.
 */
export function renderUi(ui: ReactElement, options: RenderUiOptions = {}): RenderUiResult {
  const { reducedMotion: reduce, advanceTimers, wrapper: callerWrapper, ...renderOptions } = options;
  if (reduce !== undefined) setReducedMotion(reduce);
  const user = userEvent.setup(advanceTimers !== undefined ? { advanceTimers } : {});
  const store = createSheetStackStore();
  const wrapper = ({ children }: { children: ReactNode }): ReactElement =>
    createElement(SheetStackProvider, {
      store,
      children: callerWrapper === undefined ? children : createElement(callerWrapper, null, children),
    });
  const result = render(ui, { ...renderOptions, wrapper });
  return { ...result, user };
}
