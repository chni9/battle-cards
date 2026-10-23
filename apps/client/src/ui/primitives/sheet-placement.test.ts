import { describe, expect, it } from 'vitest';
import { resolveSheetPlacement } from './sheet-placement';

describe('resolveSheetPlacement (spec v7 §7.7, §6.4)', () => {
  it('centers auto sheets on desktop boxes only', () => {
    const auto = (width: number, height: number): string => resolveSheetPlacement('auto', { width, height });
    expect([auto(1440, 900), auto(1024, 600), auto(390, 844), auto(768, 1024), auto(844, 390)]).toEqual(['center', 'center', 'bottom', 'bottom', 'bottom']);
  });
  it('keeps an explicit placement', () => {
    expect(resolveSheetPlacement('bottom', { width: 1440, height: 900 })).toBe('bottom');
    expect(resolveSheetPlacement('center', { width: 390, height: 844 })).toBe('center');
  });
});
