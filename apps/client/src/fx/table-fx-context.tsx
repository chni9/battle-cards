/**
 * Table FX queue — fire-and-forget presentational overlays (Lot 14).
 * Callers must never await enqueue before sending intents.
 */

import {
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { TableFxContext, type TableFxContextValue, type TableFxInput } from './table-fx-hooks';
import { TableFxOverlay } from './table-fx-overlay';
import { FX_TTL_MS, type TableFxEvent } from './table-fx-types';

let fxSeq = 0;

export function TableFxProvider({ children }: { children: ReactNode }): ReactElement {
  const [events, setEvents] = useState<TableFxEvent[]>([]);
  const [mirrorHighlightIds, setMirrorHighlightIds] = useState<readonly string[]>([]);

  const enqueue = useCallback((event: TableFxInput): void => {
    const id = `fx-${String(++fxSeq)}`;
    const expiresAt = event.expiresAt ?? Date.now() + FX_TTL_MS;
    const full: TableFxEvent = { ...event, id, expiresAt };
    setEvents((prev) => [...prev.filter((e) => e.expiresAt > Date.now()), full]);
    window.setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }, Math.max(0, expiresAt - Date.now()) + 50);
  }, []);

  const value = useMemo(
    (): TableFxContextValue => ({
      enqueue,
      events,
      mirrorHighlightIds,
      setMirrorHighlightIds,
    }),
    [enqueue, events, mirrorHighlightIds],
  );

  return (
    <TableFxContext.Provider value={value}>
      {children}
      <TableFxOverlay />
    </TableFxContext.Provider>
  );
}
