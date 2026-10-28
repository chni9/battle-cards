/**
 * V7 arena shell (technical spec v7 §4.4, §6.1; Lot 74 plan Appendix A; L74-01).
 *
 * - §4.4: `App` (playing) and `EndScreen` (finished board) mount it behind the `?ui=next` switch
 *   (`ui-switch.ts`, unchanged since L72-20); the default and tutorial rooms keep `TableScreen`.
 * - §6.1 and Q60: six regions, top to bottom, that always render with their empty state. Later
 *   Lot 74 tasks render inside each region element and keep its attributes and anchors.
 * - §6.4 and L53-07: it fills `#root` with no viewport unit and never page-scrolls.
 * - §4.3 and Appendix A.2: the action lock is computed once per render and models are passed
 *   down as props, with no React context for game data.
 *
 * Import rule (L74-01 brief): `screens/arena/` imports only from `ui/`, `view-model/`, `fx/`,
 * `net/` (types), `help/`, `feedback/` and the shared screen modules. It never imports
 * `screens/table/` or `design/`; `TableScreenProps` is the one type behind the alias below.
 */

import { useRef, type ReactElement } from 'react';

import { actionLock, type ActionContext } from '../../view-model/action-lock';
import { seats } from '../../view-model/seats';
import type { TableScreenProps } from '../table';
import { arenaRegionAttributes } from './arena-regions';
import { ArenaSeats } from './arena-seats';
import { TopBar } from './top-bar';
import { useArenaLayoutBox } from './use-arena-layout-box';

export type ArenaScreenProps = TableScreenProps;

export function ArenaScreen(props: ArenaScreenProps): ReactElement {
  const { view } = props;
  const readOnly = props.readOnly ?? false;
  const ctx: ActionContext = { subChoice: props.subChoice, readOnly };
  const lock = actionLock(view, ctx);
  const arenaRef = useRef<HTMLDivElement>(null);
  const layoutBox = useArenaLayoutBox(arenaRef);
  const seatsModel = seats(view, layoutBox);
  return (
    <main
      data-zone="table"
      data-arena="next"
      data-action-lock={lock ?? 'none'}
      className="v7-ground relative flex h-full w-full min-w-0 flex-col overflow-hidden font-v7-body text-v7-text"
    >
      <div {...arenaRegionAttributes('top-bar')} className="shrink-0 px-2 pt-2">
        {/* `onLeave` and `onForfeit` are App-level, not ArenaIntents (Appendix A.6): the bar calls them from its confirm. */}
        <TopBar
          view={view}
          readOnly={readOnly}
          statusLabel={props.statusLabel}
          onLeave={props.onLeave}
          onForfeit={props.onForfeit}
          {...(props.onOpenFeedback !== undefined ? { onOpenFeedback: props.onOpenFeedback } : {})}
        />
      </div>
      <div {...arenaRegionAttributes('ticker')} className="shrink-0 px-2">
        <p data-zone="log-collapsed" className="truncate text-v7-caption text-v7-text-2">
          {view.actionLog.length === 0 ? 'No actions yet' : null}
        </p>
      </div>
      {/* Measured here (L74-04): relative, overflow-hidden, no padding, so its box is the seats' positioning box (Appendix A.3). */}
      <div
        ref={arenaRef}
        {...arenaRegionAttributes('arena')}
        data-zone="felt"
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        {/* No `onOpenSeat` yet: L74-05 adds the sheet host, opens the seat sheet and derives `tappedSeatId`. */}
        <ArenaSeats model={seatsModel} arena={layoutBox.arena} tappedSeatId={null} />
        <div data-zone="pending" data-hint-anchor="incoming" />
      </div>
      <div {...arenaRegionAttributes('self-strip')} data-zone="private-zone" data-player-id={view.you} className="shrink-0 px-2">
        <div data-zone="resources" data-hint-anchor="resources" />
      </div>
      <div {...arenaRegionAttributes('hand')} data-zone="card-band" className="min-w-0 shrink-0">
        <div data-zone="hand" data-hint-anchor="hand">
          {view.self.hand.length === 0 ? (
            <p className="flex flex-col font-v7-body text-v7-caption font-bold text-v7-text-2">
              <span>Hand</span>
              <span>Empty</span>
            </p>
          ) : null}
        </div>
        <div data-zone="specials" data-hint-anchor="specials">
          {view.self.specialCards.length === 0 ? (
            <p className="flex flex-col font-v7-body text-v7-caption font-bold text-v7-text-2">
              <span>Specials</span>
              <span>None</span>
            </p>
          ) : null}
        </div>
      </div>
      <div {...arenaRegionAttributes('dock')} data-zone="dock" className="shrink-0 px-2 pb-2" />
    </main>
  );
}
