/**
 * Where a sheet sits (technical spec v7 §6.4, §7.7): shared dialogs are bottom sheets on phones
 * and centered dialogs on desktop. `'auto'` reuses the one layout rule, `viewportModeFor`, so a
 * landscape phone (844×390) and a portrait tablet stay bottom sheets. Only Dialog passes
 * `'auto'`; a plain Sheet defaults to `'bottom'`.
 */

import { viewportModeFor } from '../viewport-mode';

export type SheetPlacement = 'bottom' | 'center';
export type SheetPlacementPreference = SheetPlacement | 'auto';

export function resolveSheetPlacement(
  preference: SheetPlacementPreference,
  box: { readonly width: number; readonly height: number },
): SheetPlacement {
  if (preference !== 'auto') return preference;
  return viewportModeFor(box) === 'desktop' ? 'center' : 'bottom';
}
