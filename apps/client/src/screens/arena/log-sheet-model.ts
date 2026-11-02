/**
 * Log ticker label and stick rule — technical spec v7 §6.9; Appendix A `table-action-log-panel`
 * (the V2 panel's empty copy and its 48 px stick); L74-15.
 *
 * Pure: no React, no layout. The copy is V2's (`view-model/table-copy.ts`), reused verbatim.
 */

import type { LogLine } from '../../view-model/log';
import { ACTION_LOG_OPEN_LABEL } from '../../view-model/table-copy';

/** V2 `action-log-panel.tsx` empty copy. */
export const LOG_EMPTY_COPY = 'No actions yet';

/** V2: the log follows a new line only while the reader is within 48 px of the bottom. */
export const LOG_STICK_THRESHOLD_PX = 48;

/** `Action log: {newest line | No actions yet}`: the ticker's accessible name holds its visible text. */
export function tickerLabel(line: LogLine | null): string {
  return `${ACTION_LOG_OPEN_LABEL}: ${line?.text ?? LOG_EMPTY_COPY}`;
}

export interface LogScrollBox {
  readonly scrollHeight: number;
  readonly clientHeight: number;
  readonly scrollTop: number;
}

/** `scrollHeight - clientHeight - scrollTop < LOG_STICK_THRESHOLD_PX` (V2 `< 48`). */
export function isNearLogBottom(box: LogScrollBox): boolean {
  return box.scrollHeight - box.clientHeight - box.scrollTop < LOG_STICK_THRESHOLD_PX;
}
