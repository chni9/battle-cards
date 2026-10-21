import { describe, expect, it, vi } from 'vitest';
import { EMPTY_SHEET_STACK } from './sheet-stack';
import { createSheetStackStore } from './sheet-stack-context';

describe('createSheetStackStore (L72-09)', () => {
  it('starts empty and notifies subscribers only on real changes', () => {
    const store = createSheetStackStore();
    expect(store.getSnapshot()).toBe(EMPTY_SHEET_STACK);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.open({ id: 'card', mode: 'read-only' });
    store.open({ id: 'card', mode: 'read-only' });
    expect(listener).toHaveBeenCalledTimes(1);
    const snapshot = store.getSnapshot();
    store.setMinimized('card', false);
    expect(store.getSnapshot()).toBe(snapshot);
    store.setDismissLocked('card', true);
    store.close('card');
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.open({ id: 'kit', mode: 'read-only' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
  it('gives each store its own state', () => {
    const [first, second] = [createSheetStackStore(), createSheetStackStore()];
    first.open({ id: 'card', mode: 'read-only' });
    expect(second.getSnapshot().entries).toEqual([]);
  });
});
