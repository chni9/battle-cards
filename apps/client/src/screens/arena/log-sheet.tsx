/**
 * The action log sheet — technical spec v7 §6.9; L56-05, L63-06; Appendix A `table-action-log-panel`,
 * `table-action-log-collapsed-dialog`, `table-action-log-inspect`; L74-15.
 *
 * A read-only bottom `Sheet` hosted by the arena's sheets reducer (`{ kind: 'log' }`). Lines group by
 * table round under sticky `Round N` headers (the chat's count) and render the `log(view)` segments.
 * No filter, search, Why or export (L45-05; the DEV Excel stays on Game over). A card name opens the
 * read-only `{ kind: 'log' }` card sheet and sends nothing (§6.6.4).
 *
 * The sheet opens on the newest line and then follows new lines only within 48 px of the bottom (V2),
 * as `ui/chat/chat-log.tsx` does: the `Sheet` body is the scroller, so the panel finds it with
 * `closest` and a `ResizeObserver` on the panel keeps it stuck while the reader is there (a sheet
 * mounts its content hidden, so only an observer sees it gain a height).
 */

import { chatRoundLabel, type PlayingStateView } from '@card-battle/shared';
import { useEffect, useRef, type ReactElement } from 'react';

import { Sheet } from '../../ui/primitives/sheet';
import type { LogModel } from '../../view-model/log';
import { ACTION_LOG_OPEN_LABEL } from '../../view-model/table-copy';
import { arenaSheetKey } from './arena-sheets';
import type { CardSheetSource } from './card-sheet-source';
import { LogLineSegments } from './log-line';
import { isNearLogBottom, LOG_EMPTY_COPY } from './log-sheet-model';

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
  /** Whether the reader is at the bottom, so the next new line should follow. Starts true: open on the newest. */
  const stuck = useRef(true);

  useEffect(() => {
    if (open) {
      stuck.current = true;
    }
  }, [open]);

  useEffect(() => {
    const body = panel.current;
    const scroller = body?.closest<HTMLElement>('[data-zone="sheet-body"]') ?? null;

    if (!open || body === null || scroller === null) {
      return;
    }

    const follow = (): void => {
      stuck.current = isNearLogBottom(scroller);
    };
    const stick = (): void => {
      if (stuck.current) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    };
    const observer = new ResizeObserver(stick);

    scroller.addEventListener('scroll', follow, { passive: true });
    observer.observe(body);
    stick();

    return () => {
      scroller.removeEventListener('scroll', follow);
      observer.disconnect();
    };
  }, [open]);

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
        {model.rounds.length === 0 ? (
          <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{LOG_EMPTY_COPY}</p>
        ) : (
          model.rounds.map((group) => (
            <section key={group.round} data-log-round={String(group.round)}>
              <h3 className="sticky top-0 z-[1] bg-v7-panel py-1 font-v7-display text-v7-caption text-v7-text-2">
                {chatRoundLabel(group.round)}
              </h3>
              <ul className="flex flex-col gap-1 pb-2">
                {group.lines.map((line) => (
                  <li
                    key={line.index}
                    data-log-line={String(line.index)}
                    className="break-words font-v7-body text-v7-body font-bold text-v7-text"
                  >
                    <LogLineSegments line={line} view={view} onOpenCard={onOpenCard} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </Sheet>
  );
}
