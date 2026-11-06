/**
 * The action log sheet — technical spec v7 §6.9; L56-05, L63-06; Appendix A `table-action-log-panel`,
 * `table-action-log-collapsed-dialog`, `table-action-log-inspect`; L74-15.
 *
 * A read-only bottom `Sheet` hosted by the arena's sheets reducer (`{ kind: 'log' }`). Lines group by
 * table round under sticky `Round N` headers (the chat's count) and render the `log(view)` segments
 * (`LogRounds`, shared with the desktop log panel since L75-02). No filter, search, Why or export
 * (L45-05; the DEV Excel stays on Game over). A card name opens the read-only `{ kind: 'log' }` card
 * sheet and sends nothing (§6.6.4).
 *
 * The sheet opens on the newest line and then follows new lines only within 48 px of the bottom (V2),
 * as `ui/chat/chat-log.tsx` does: the `Sheet` body is the scroller, so the panel finds it with
 * `closest` and `useLogFollow`'s `ResizeObserver` on the panel keeps it stuck while the reader is
 * there (a sheet mounts its content hidden, so only an observer sees it gain a height).
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useRef, type ReactElement } from 'react';

import { Sheet } from '../../ui/primitives/sheet';
import type { LogModel } from '../../view-model/log';
import { ACTION_LOG_OPEN_LABEL } from '../../view-model/table-copy';
import { arenaSheetKey } from './arena-sheets';
import type { CardSheetSource } from './card-sheet-source';
import { LogRounds } from './log-rounds';
import { useLogFollow } from './use-log-follow';

export interface LogSheetProps {
  open: boolean;
  view: PlayingStateView;
  /** `log(view)`, computed once by ArenaScreen. */
  model: LogModel;
  onClose: () => void;
  onOpenCard: (source: CardSheetSource) => void;
}

export function LogSheet({ open, view, model, onClose, onOpenCard }: LogSheetProps): ReactElement {
  const panel = useRef<HTMLDivElement>(null);
  useLogFollow(open, panel, (content) => content.closest<HTMLElement>('[data-zone="sheet-body"]'));

  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      title={ACTION_LOG_OPEN_LABEL}
      onClose={onClose}
      dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'log' }) }}
    >
      <div ref={panel} data-zone="action-log-panel">
        <LogRounds view={view} model={model} onOpenCard={onOpenCard} inset="sheet-body" />
      </div>
    </Sheet>
  );
}
