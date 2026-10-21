/**
 * The keyboard model Tabs and Segmented share (technical spec v7 §11: real radio and tab
 * semantics). A roving tabindex keeps one item in the Tab order; arrow keys move focus and
 * select, wrapping and skipping disabled items, as in the WAI-ARIA APG tabs (horizontal,
 * automatic activation, plus Home and End) and radio group (both arrow axes) patterns.
 */

export type RovingKey = 'next' | 'previous' | 'first' | 'last';

/** The next enabled index from `from` in `step` direction, wrapping; `from` when no other is enabled. */
export function nextEnabledIndex(disabled: readonly boolean[], from: number, step: 1 | -1): number {
  const n = disabled.length;
  for (let i = 1; i <= n; i += 1) {
    const index = (((from + step * i) % n) + n) % n;
    if (index !== from && disabled[index] !== true) return index;
  }
  return from;
}

/** The first or last enabled index, or -1 when every item is disabled. */
export function edgeEnabledIndex(disabled: readonly boolean[], edge: 'first' | 'last'): number {
  return edge === 'first' ? disabled.indexOf(false) : disabled.lastIndexOf(false);
}

const TAB_KEYS: Readonly<Record<string, RovingKey>> = {
  ArrowRight: 'next',
  ArrowLeft: 'previous',
  Home: 'first',
  End: 'last',
};

const RADIO_KEYS: Readonly<Record<string, RovingKey>> = {
  ArrowDown: 'next',
  ArrowRight: 'next',
  ArrowUp: 'previous',
  ArrowLeft: 'previous',
};

/**
 * Alt, Ctrl and Meta chords belong to the browser and the OS (history, tab switching, word
 * jumps), so roving handlers ignore them. Shift is left alone.
 */
export function hasCommandModifier(event: {
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}): boolean {
  return event.altKey || event.ctrlKey || event.metaKey;
}

export function rovingKeyFor(key: string, pattern: 'tabs' | 'radios'): RovingKey | null {
  return (pattern === 'tabs' ? TAB_KEYS : RADIO_KEYS)[key] ?? null;
}
