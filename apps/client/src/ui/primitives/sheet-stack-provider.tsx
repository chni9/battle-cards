/**
 * Scopes a sheet stack to a subtree (technical spec v7 §6.7). The app does not need it: the
 * context default is a shared module-level store. Tests use it, through `renderUi`, so one
 * render's sheets never see another's (L72-09).
 */

import { useState, type ReactElement, type ReactNode } from 'react';
import { SheetStackContext, createSheetStackStore, type SheetStackStore } from './sheet-stack-context';

export interface SheetStackProviderProps {
  store?: SheetStackStore;
  children: ReactNode;
}

export function SheetStackProvider({ store, children }: SheetStackProviderProps): ReactElement {
  const [ownStore] = useState(createSheetStackStore);
  return <SheetStackContext.Provider value={store ?? ownStore}>{children}</SheetStackContext.Provider>;
}
