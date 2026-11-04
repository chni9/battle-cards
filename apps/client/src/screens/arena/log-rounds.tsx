/**
 * The round-grouped action log, shared by the log sheet and the desktop log panel — technical
 * spec v7 §6.9; Appendix A `table-action-log-panel`; L74-15, moved here in L75-02.
 *
 * Lines group by table round under sticky `Round N` headers (the chat's count) and render the
 * `log(view)` segments, or "No actions yet". A card name opens the read-only `{ kind: 'log' }`
 * card sheet and sends nothing (§6.6.4).
 */

import { chatRoundLabel, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import type { LogModel } from '../../view-model/log';
import type { CardSheetSource } from './card-sheet-source';
import { LogLineSegments } from './log-line';
import { LOG_EMPTY_COPY } from './log-sheet-model';

export interface LogRoundsProps {
  view: PlayingStateView;
  model: LogModel;
  onOpenCard: (source: CardSheetSource) => void;
  /** 'sheet-body' keeps `-top-3` (the Sheet body's 12 px padding, G27); 'panel' sticks at `top-0`. */
  inset: 'sheet-body' | 'panel';
}

const HEADER_CLASS = 'z-[1] bg-v7-panel py-1 font-v7-display text-v7-caption text-v7-text-2';

export function LogRounds({ view, model, onOpenCard, inset }: LogRoundsProps): ReactElement {
  if (model.rounds.length === 0) {
    return <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{LOG_EMPTY_COPY}</p>;
  }
  return (
    <>
      {model.rounds.map((group) => (
        <section key={group.round} data-log-round={String(group.round)}>
          {/* In a sheet, `-top-3` cancels the sheet body's 12 px top padding: at `top-0` the stuck header
              sat under that band and the line scrolling behind it showed through (L74-26 gate G27). The
              panel's scrollport has no top padding, so it sticks at `top-0`. */}
          <h3 className={`sticky ${inset === 'sheet-body' ? '-top-3' : 'top-0'} ${HEADER_CLASS}`}>
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
      ))}
    </>
  );
}
