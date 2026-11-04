/**
 * The desktop log panel — technical spec v7 §6.4 (desktop: the log is a collapsible panel), §6.9;
 * Appendix A `table-action-log-panel`; Lot 75 plan Appendix A.4.1, open-question ruling 5
 * (designer 2026-11-03: expanded on mount, 320 px, a 44 px rail when collapsed); L75-02.
 *
 * - **The toggle always renders**: a 44 px button (`data-zone="log-collapsed"`, named
 *   `ACTION_LOG_OPEN_LABEL`, `aria-expanded`). It is the rendered log element while collapsed, and
 *   then the FX log endpoint (`ui/fx-anchors.ts`). It points at the list with `aria-controls` only
 *   while the list is mounted, so no id ever dangles.
 * - **Expanded**, the visible scrollport, never its taller content, carries
 *   `data-zone="action-log-panel"` (A.7). It holds the round-grouped lines (`LogRounds`, sticky
 *   `top-0` headers: the scrollport has no top padding) and follows new lines within 48 px
 *   (`useLogFollow`, shared with the log sheet). It is `relative`, so the lines' `sr-only` (absolutely
 *   positioned) text is clipped with them: without it their containing block is `<main>`, which
 *   gained ~3500 px of scrollable overflow and could be scrolled off-screen (Lot 75 Check 1).
 * - **Collapsed**, the list unmounts, so no zero-size `action-log-panel` is left for the FX
 *   (plan Review Focus 5); expanding again reopens on the newest line.
 * - Read-only (§6.6.4): the toggle and a card name send nothing.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useId, useRef, type ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { CHROME_FOCUS_CLASS, CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import type { LogModel } from '../../view-model/log';
import { ACTION_LOG_OPEN_LABEL } from '../../view-model/table-copy';
import type { CardSheetSource } from './card-sheet-source';
import { LogRounds } from './log-rounds';
import { useLogFollow } from './use-log-follow';

export interface LogPanelProps {
  /** ArenaScreenInner state `logPanelExpanded`, default true (open-question ruling 5). */
  expanded: boolean;
  view: PlayingStateView;
  /** `log(view)`: the same `logModel` the ticker and the sheet read. */
  model: LogModel;
  onToggle: () => void;
  onOpenCard: (source: CardSheetSource) => void;
}

const TOGGLE_CLASS = `flex min-h-11 min-w-11 shrink-0 items-center gap-2 bg-v7-panel text-v7-text ${CHROME_SHAPE_SM_CLASS} ${CHROME_FOCUS_CLASS}`;

export function LogPanel({ expanded, view, model, onToggle, onOpenCard }: LogPanelProps): ReactElement {
  const listId = useId();
  const content = useRef<HTMLDivElement>(null);
  // The scrollport is the content's parent: the panel's own scroller, not a Sheet body.
  useLogFollow(expanded, content, (node) => node.parentElement);

  return (
    <section
      data-log-panel={expanded ? 'expanded' : 'collapsed'}
      className={expanded ? 'flex h-full w-80 min-h-0 flex-col gap-2' : 'flex h-full w-11 flex-col'}
    >
      <button
        type="button"
        data-zone="log-collapsed"
        aria-expanded={expanded}
        {...(expanded ? { 'aria-controls': listId } : {})}
        aria-label={ACTION_LOG_OPEN_LABEL}
        title={ACTION_LOG_OPEN_LABEL}
        onClick={onToggle}
        className={`${TOGGLE_CLASS} ${expanded ? 'w-full px-3 text-left' : 'justify-center'}`}
      >
        <Icon name="log" size={18} />
        {expanded ? (
          <span aria-hidden="true" className="min-w-0 flex-1 truncate font-v7-display text-v7-caption">
            {ACTION_LOG_OPEN_LABEL}
          </span>
        ) : null}
      </button>
      {expanded ? (
        <div
          id={listId}
          data-zone="action-log-panel"
          className={`relative min-h-0 flex-1 overflow-y-auto bg-v7-panel px-3 pb-2 ${CHROME_SHAPE_SM_CLASS}`}
        >
          <div ref={content}>
            <LogRounds view={view} model={model} onOpenCard={onOpenCard} inset="panel" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
