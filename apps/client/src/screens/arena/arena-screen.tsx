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

import { useCallback, useRef, useState, type ReactElement } from 'react';

import { actionLock, type ActionContext } from '../../view-model/action-lock';
import { selfStrip } from '../../view-model/self-strip';
import { seats } from '../../view-model/seats';
import { threats } from '../../view-model/threats';
import type { TableScreenProps } from '../table';
import { createArenaCommit } from './arena-commit';
import { arenaRegionAttributes } from './arena-regions';
import { ArenaSeats } from './arena-seats';
import {
  arenaSheetEntries,
  closeArenaSheet,
  EMPTY_ARENA_SHEETS,
  openArenaSheet,
  openSeatId,
  type ArenaSheet,
  type ArenaSheetsState,
} from './arena-sheets';
import { CardSheet } from './card-sheet';
import { CentralPlate } from './central-plate';
import { HandFan } from './hand-fan';
import { selectedHandInstanceId } from './hand-fan-model';
import { KitSheet } from './kit-sheet';
import { SeatSheet } from './seat-sheet';
import { SelfStrip } from './self-strip';
import { ThreatLayer } from './threat-layer';
import { TopBar } from './top-bar';
import { useArenaLayoutBox } from './use-arena-layout-box';

export type ArenaScreenProps = TableScreenProps;

export function ArenaScreen(props: ArenaScreenProps): ReactElement {
  const { view } = props;
  const readOnly = props.readOnly ?? false;
  const ctx: ActionContext = { subChoice: props.subChoice, readOnly };
  const lock = actionLock(view, ctx);
  // The single exit for every ArenaIntent (§6.6.4, Appendix A.6): built once per render; the handlers are read at call time.
  const commit = createArenaCommit(props);
  const arenaRef = useRef<HTMLDivElement>(null);
  const layoutBox = useArenaLayoutBox(arenaRef);
  const seatsModel = seats(view, layoutBox);
  const threatModel = threats(view, props.subChoice);
  // The POV strip and, in `.dock`, its dock: computed once here, L74-13 reads `strip.dock` (Appendix A.2).
  const strip = selfStrip(view, ctx);
  // The read-only sheet host (Appendix A.5): one reducer state, one component per entry.
  const [sheets, setSheets] = useState<ArenaSheetsState>(EMPTY_ARENA_SHEETS);
  const openSheet = useCallback((sheet: ArenaSheet): void => {
    setSheets((current) => openArenaSheet(current, sheet));
  }, []);
  const closeSheet = useCallback((sheet: ArenaSheet): void => {
    setSheets((current) => closeArenaSheet(current, sheet));
  }, []);
  const tappedSeatId = openSeatId(sheets);
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
        <ArenaSeats
          model={seatsModel}
          arena={layoutBox.arena}
          tappedSeatId={tappedSeatId}
          onOpenSeat={(playerId) => {
            openSheet({ kind: 'seat', playerId });
          }}
        />
        {/* After the seats, so they paint above them: arrows at z 10, the plate at z 20, both under the sheets. */}
        <ThreatLayer
          model={threatModel}
          layout={seatsModel.layout}
          arena={layoutBox.arena}
          povId={view.you}
          tappedSeatId={tappedSeatId}
        />
        <CentralPlate
          view={view}
          model={threatModel}
          mode={seatsModel.layout.mode}
          arena={layoutBox.arena}
          onOpenCard={(source) => {
            openSheet({ kind: 'card', source });
          }}
        />
      </div>
      <div {...arenaRegionAttributes('self-strip')} data-zone="private-zone" data-player-id={view.you} className="shrink-0 px-2">
        {strip.resources === null ? (
          // A walk-in has no resources (Q38): the empty state until L74-23 adds the Watching strip.
          <div data-zone="resources" data-hint-anchor="resources" />
        ) : (
          <SelfStrip
            model={strip}
            onOpenKit={(kitId) => {
              openSheet({ kind: 'kit', kitId });
            }}
            onOpenCard={(source) => {
              openSheet({ kind: 'card', source });
            }}
          />
        )}
      </div>
      <div {...arenaRegionAttributes('hand')} data-zone="card-band" className="min-w-0 shrink-0">
        <HandFan
          view={view}
          ctx={ctx}
          selectedInstanceId={selectedHandInstanceId(sheets)}
          onOpenCard={(source) => {
            openSheet({ kind: 'card', source });
          }}
        />
      </div>
      <div {...arenaRegionAttributes('dock')} data-zone="dock" className="shrink-0 px-2 pb-2" />
      {/* The sheets are the last children of the arena root and never inside a clickable element: a React portal bubbles clicks to its ancestors. No `default`, so a new `ArenaSheet` variant fails `noImplicitReturns` until it gets a case. */}
      {arenaSheetEntries(sheets).map(({ sheet, key, open }) => {
        switch (sheet.kind) {
          case 'card':
            return (
              <CardSheet
                key={key}
                open={open}
                source={sheet.source}
                view={view}
                ctx={ctx}
                commit={commit}
                onClose={() => {
                  closeSheet(sheet);
                }}
              />
            );
          case 'kit':
            return (
              <KitSheet
                key={key}
                open={open}
                kitId={sheet.kitId}
                onClose={() => {
                  closeSheet(sheet);
                }}
              />
            );
          case 'seat': {
            const seat = seatsModel.seats.find((entry) => entry.playerId === sheet.playerId);
            return seat === undefined ? null : (
              <SeatSheet
                key={key}
                open={open}
                seat={seat}
                view={view}
                threatModel={threatModel}
                onClose={() => {
                  closeSheet(sheet);
                }}
                onOpenKit={(kitId) => {
                  openSheet({ kind: 'kit', kitId });
                }}
                onOpenCard={(source) => {
                  openSheet({ kind: 'card', source });
                }}
              />
            );
          }
        }
      })}
    </main>
  );
}
