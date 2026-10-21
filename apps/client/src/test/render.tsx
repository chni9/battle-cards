/**
 * Shared render helper for client component tests (technical spec v7 §4.5, §12.2; L72-06).
 *
 * Importing this module installs, once per test file: a `window.matchMedia` stub that makes
 * the reduced-motion preference scriptable, and an `afterEach` that unmounts every tree and
 * resets that preference. Vitest runs without globals here, so RTL never registers its own
 * cleanup. Every `.test.tsx` opens with `// @vitest-environment happy-dom`.
 */
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { cleanup, render } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, vi } from 'vitest';

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

// RTL's async drain advances fake clocks only when it sees a global `jest` (v7 §12.2).
Reflect.set(globalThis, 'jest', {
  advanceTimersByTime: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },
});

afterEach(() => {
  cleanup();
  setReducedMotion(false);
});

export interface RenderUiOptions extends Omit<RenderOptions, 'queries'> {
  reducedMotion?: boolean;
  /** Pass `vi.advanceTimersByTime` when the test uses fake timers. */
  advanceTimers?: (delay: number) => unknown;
}

export interface RenderUiResult extends RenderResult {
  user: UserEvent;
}

export function renderUi(ui: ReactElement, options: RenderUiOptions = {}): RenderUiResult {
  const { reducedMotion: reduce, advanceTimers, ...renderOptions } = options;
  if (reduce !== undefined) setReducedMotion(reduce);
  const user = userEvent.setup(advanceTimers !== undefined ? { advanceTimers } : {});
  const result = render(ui, renderOptions);
  return { ...result, user };
}
