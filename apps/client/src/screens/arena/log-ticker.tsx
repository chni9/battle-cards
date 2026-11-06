/**
 * The one-line log ticker — technical spec v7 §6.1 item 2 and §6.9; L56-05; L74-15.
 *
 * One 44 px button on `--panel` showing the newest public line (`log(view).ticker`), truncated, or
 * "No actions yet". Its name holds its visible text (`Action log: {line}`). A tap opens the log
 * sheet and sends nothing (§6.6.4). `data-zone="log-collapsed"` stays the FX log endpoint
 * (`ui/fx-anchors.ts`). A card in the ticker is plain text: it takes no `onOpenCard`, because a
 * button holds no button. L75-04 (plan A.8.6): `tutorialHighlight` marks the button `action-log` for
 * the board tour.
 */

import type { PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { CHROME_FOCUS_CLASS, CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import type { LogLine } from '../../view-model/log';
import { LogLineSegments } from './log-line';
import { LOG_EMPTY_COPY, tickerLabel } from './log-sheet-model';

export interface LogTickerProps {
  line: LogLine | null;
  view: PlayingStateView;
  onOpen: () => void;
  /** L75-04: the board tour's `action-log` mark on the button. */
  tutorialHighlight?: boolean;
}

export function LogTicker({ line, view, onOpen, tutorialHighlight = false }: LogTickerProps): ReactElement {
  const label = tickerLabel(line);

  return (
    <button
      type="button"
      data-zone="log-collapsed"
      {...(tutorialHighlight ? { 'data-tutorial-highlight': 'action-log' } : {})}
      aria-haspopup="dialog"
      aria-label={label}
      title={label}
      onClick={onOpen}
      className={`flex min-h-11 w-full min-w-0 items-center gap-2 bg-v7-panel px-3 text-left ${CHROME_SHAPE_SM_CLASS} ${CHROME_FOCUS_CLASS}`}
    >
      <Icon name="log" size={18} />
      <span className="min-w-0 flex-1 truncate font-v7-body text-v7-caption font-bold text-v7-text">
        {line === null ? LOG_EMPTY_COPY : <LogLineSegments line={line} view={view} />}
      </span>
    </button>
  );
}
