import { describe, expect, it } from 'vitest';
import { DEV_UI_PATH, isDevUiRoute } from './dev-ui-route';

describe('isDevUiRoute (technical spec v7 §4.2, DEV only)', () => {
  it('serves the gallery at /dev/ui in DEV', () => {
    expect(DEV_UI_PATH).toBe('/dev/ui');
    expect(['/dev/ui', '/dev/ui/', '/dev/ui/card'].map((path) => isDevUiRoute(path, true))).toEqual([true, true, true]);
  });

  it('never matches in a production build', () => {
    expect(['/dev/ui', '/dev/ui/', '/dev/ui/card', '/'].map((path) => isDevUiRoute(path, false))).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('ignores every other path in DEV', () => {
    expect(['/', '/admin', '/admin/feedback', '/dev', '/dev/uix', '/dev/ui-kit'].some((path) => isDevUiRoute(path, true))).toBe(
      false,
    );
  });
});
