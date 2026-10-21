import { describe, expect, it } from 'vitest';
import { Z_INDEX } from '../layers';
import { EMPTY_SHEET_STACK, MAX_READ_ONLY_DEPTH, closeSheet, escTargetId, isSheetInert, openSheet, setSheetDismissLocked, setSheetMinimized, sheetPaintOrder, sheetZIndex, type SheetMode, type SheetStackState } from './sheet-stack';

interface OpenInput { readonly id: string; readonly mode: SheetMode; readonly dismissLocked?: boolean }
const ro = (id: string): OpenInput => ({ id, mode: 'read-only' });
const bl = (id: string): OpenInput => ({ id, mode: 'blocking' });
const openAll = (...inputs: readonly OpenInput[]): SheetStackState => inputs.reduce<SheetStackState>((s, i) => openSheet(s, i), EMPTY_SHEET_STACK);
const paintIds = (s: SheetStackState): string[] => sheetPaintOrder(s).map((e) => e.id);
const min = (s: SheetStackState, id: string, minimized = true): SheetStackState => setSheetMinimized(s, id, minimized);

describe('sheet stack paint order (spec v7 §6.7)', () => {
  it('paints read-only sheets first, expanded blocking sheets above them and minimized bars on top', () => {
    const s = openAll(bl('reward-1'), ro('card'), bl('reward-2'), ro('kit'));
    expect(paintIds(s)).toEqual(['card', 'kit', 'reward-1', 'reward-2']);
    expect(paintIds(min(s, 'reward-1'))).toEqual(['card', 'kit', 'reward-2', 'reward-1']);
  });
  it('paints at most MAX_READ_ONLY_DEPTH read-only sheets and brings the hidden one back when the top closes', () => {
    expect(MAX_READ_ONLY_DEPTH).toBe(2);
    const s = openAll(ro('seat'), ro('card'), ro('kit'));
    expect(paintIds(s)).toEqual(['card', 'kit']);
    expect(s.entries.map((e) => e.id)).toEqual(['seat', 'card', 'kit']);
    expect(paintIds(closeSheet(s, 'kit'))).toEqual(['seat', 'card']);
  });
  it('moves a restored sheet to the top of its group', () => {
    expect(paintIds(min(min(openAll(bl('reward-1'), bl('reward-2')), 'reward-1'), 'reward-1', false))).toEqual(['reward-2', 'reward-1']);
  });
});

describe('sheet stack Esc target (Q49)', () => {
  it('targets only the top read-only sheet', () => {
    const s = openAll(ro('card'), ro('kit'));
    expect(escTargetId(s)).toBe('kit');
    expect(escTargetId(closeSheet(s, 'kit'))).toBe('card');
    expect(escTargetId(EMPTY_SHEET_STACK)).toBeNull();
  });
  it('targets nothing while an expanded blocking sheet is on top, even one opened first', () => {
    expect(escTargetId(openAll(bl('mirror'), ro('card')))).toBeNull();
  });
  it('targets the read-only sheet above a minimized blocking bar', () => {
    const s = openSheet(min(openAll(bl('reward')), 'reward'), ro('card'));
    expect(escTargetId(s)).toBe('card');
    expect(paintIds(s)).toEqual(['card', 'reward']);
  });
  it('lets a dismiss-locked top sheet absorb Esc instead of passing it down', () => {
    const s = openAll(ro('card'), { id: 'feedback', mode: 'read-only', dismissLocked: true });
    expect(escTargetId(s)).toBeNull();
    expect(escTargetId(setSheetDismissLocked(s, 'feedback', false))).toBe('feedback');
  });
});

describe('sheet stack inertness and layers', () => {
  it('makes every sheet under an expanded blocking sheet inert, never a bar or an unknown id', () => {
    const s = openAll(ro('card'), bl('reward-1'), bl('reward-2'));
    expect(['card', 'reward-1', 'reward-2', 'missing'].map((id) => isSheetInert(s, id))).toEqual([true, true, false, false]);
    const bars = min(min(s, 'reward-2'), 'reward-1');
    expect(isSheetInert(bars, 'card')).toBe(false);
    expect(isSheetInert(bars, 'reward-1')).toBe(false);
  });
  it('keeps z-indexes inside their Z_INDEX layers', () => {
    const s = min(openAll(ro('card'), ro('kit'), bl('reward'), bl('steal')), 'steal');
    expect(['card', 'kit', 'reward', 'steal', 'missing'].map((id) => sheetZIndex(s, id)))
      .toEqual([Z_INDEX.sheet, Z_INDEX.sheet + 1, Z_INDEX.sheet + 2, Z_INDEX.sheetBar, Z_INDEX.sheet]);
    expect(Z_INDEX).toEqual({ sheet: 50, sheetBar: 80, banner: 90, toast: 95 });
  });
  it('returns the same state when an update changes nothing', () => {
    const s = openAll(ro('card'));
    expect(openSheet(s, ro('card'))).toBe(s);
    expect(closeSheet(s, 'missing')).toBe(s);
    expect(setSheetMinimized(s, 'card', false)).toBe(s);
    expect(setSheetMinimized(s, 'missing', true)).toBe(s);
    expect(setSheetDismissLocked(s, 'card', false)).toBe(s);
    expect(closeSheet(s, 'card').entries).toEqual([]);
  });
});
