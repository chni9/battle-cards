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
 * - **`nudge`** (final review M5): Menu → Action log with the panel already open scrolls it to the newest
 *   line and focuses the toggle, the only answer an open panel can give.
 * - Read-only (§6.6.4): the toggle and a card name send nothing.
 * - L75-04 (plan A.8.6): `tutorialHighlight` marks the toggle `action-log` for the board tour,
 *   expanded or collapsed.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useEffect, useId, useRef, type ReactElement } from 'react';

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
  /**
   * Menu → Action log presses (final review M5). Each change scrolls the panel to its newest line and
   * focuses the toggle, so the menu entry answers when the panel is already open. 0 on mount: no move.
   */
  nudge?: number;
  view: PlayingStateView;
  /** `log(view)`: the same `logModel` the ticker and the sheet read. */
  model: LogModel;
  onToggle: () => void;
  onOpenCard: (source: CardSheetSource) => void;
  /** L75-04: `data-tutorial-highlight="action-log"` on the toggle. */
  tutorialHighlight?: boolean;
}

/** A function, not an inline write: the React Compiler lint rejects assigning a DOM property read through a ref. */
function scrollToNewest(scroller: HTMLElement): void {
  scroller.scrollTop = scroller.scrollHeight;
}

const TOGGLE_CLASS = `flex min-h-11 min-w-11 shrink-0 items-center gap-2 bg-v7-panel text-v7-text ${CHROME_SHAPE_SM_CLASS} ${CHROME_FOCUS_CLASS}`;

export function LogPanel({
  expanded,
  nudge = 0,
  view,
  model,
  onToggle,
  onOpenCard,
  tutorialHighlight = false,
}: LogPanelProps): ReactElement {
  const listId = useId();
  const content = useRef<HTMLDivElement>(null);
  // The scrollport is the content's parent: the panel's own scroller, not a Sheet body.
  useLogFollow(expanded, content, (node) => node.parentElement);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (nudge === 0) return;
    const scroller = content.current?.parentElement;
    if (scroller != null) scrollToNewest(scroller);
    toggle.current?.focus();
  }, [nudge]);

  return (
    <section
      data-log-panel={expanded ? 'expanded' : 'collapsed'}
      className={expanded ? 'flex h-full w-80 min-h-0 flex-col gap-2' : 'flex h-full w-11 flex-col'}
    >
      <button
        ref={toggle}
        type="button"
        data-zone="log-collapsed"
        {...(tutorialHighlight ? { 'data-tutorial-highlight': 'action-log' } : {})}
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
