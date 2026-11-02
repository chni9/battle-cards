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
 * - §6.6.2, §6.6.5 (L74-10): Use on a targeted card collapses its sheet into the "Choose a
 *   target" bar; `liveTargeting` re-reads the seats every render, a stale model ends targeting
 *   (Review Focus 2), a valid seat tap commits once, and `useTapGuard` ignores seat taps for
 *   `TAP_GUARD_MS` after the player ends targeting, because the bar unmounts with no shield.
 * - §6.6.3–§6.6.5 (L74-12): a card lifted from the hand drags a ghost (`useHandDrag`, portaled by
 *   `HandDragLayer`); the seats and the plate light from the latest model, a drop commits through
 *   `commit` or opens the card sheet for its pre-send choice, and nothing drags while targeting.
 * - §6.1 item 5 (L74-13): the dock region renders `strip.dock` (`Dock`), and its sends use the same
 *   tap guard as the seats, so no double tap on the targeting bar reaches Draw, Unspy or Activate
 *   duplication underneath. `dockCommit` says whether a send went out, and `actionReject` re-arms
 *   the dock's once-per-view latch (`use-commit-once.ts`, final review R2).
 * - §6.8 (L74-14): the dock's Shop opens the reducer-hosted Shop sheet; its buys go through `commit`.
 * - §6.9 (L74-15): the ticker and Menu → Action log open the reducer-hosted log sheet.
 * - §6.9 (L74-16): Chat opens the reducer-hosted chat sheet; its unread count lives in
 *   `chat-unread-store.ts`, and `onSendChat` is called directly (App-level, not an `ArenaIntent`).
 * - §6.12, §8.1, §8.3, Q63 (L74-17; plan A.9.2): `ArenaScreen` is a shell,
 *   `<TableFxProvider><ArenaScreenInner/></TableFxProvider>` like `TableScreen`, so the `fx/`
 *   overlay draws over the arena. `ArenaScreenInner` runs the shared `useTableFxTriggers` (seeded
 *   elimination beats, log chips and ghosts, threat cues), mounts `TableBannerHost` once with the
 *   V2 table's mapping, and flies own intents from the commit helper's `onSent` (`ownIntentFxFor`).
 * - §6.7 (L74-18): `props.subChoice` opens one blocking `SubChoiceSheet`; its lock ends targeting
 *   and empties the drag zones by itself.
 * - §4.1, §6.10 (L74-21): the arena records the `TURN_STARTED` sighting (`useTurnStartedRecord`),
 *   computes `turnClock(...)` once per render and hands it to the top bar. `ArenaScreenProps`
 *   extends `TableScreenProps` with the raw payload and the room's cached lobby rules.
 *
 * Import rule (L74-01 brief): `screens/arena/` imports only from `ui/`, `view-model/`, `fx/`,
 * `net/` (types), `help/`, `feedback/` and the shared screen modules. It never imports
 * `screens/table/` or `design/`; `TableScreenProps` is the one type `ArenaScreenProps` extends.
 */

import type { LobbyRules, SentenceAnnouncementLogEntry, TurnStartedPayload } from '@card-battle/shared';
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactElement } from 'react';

import { TableFxProvider } from '../../fx/table-fx-context';
import { useTableFxTriggers } from '../../fx/use-table-fx-triggers';
import { TableBannerHost } from '../../ui/banner/table-banner-host';
import { v7SeatColor } from '../../ui/palette';
import { liveSheetId } from '../../ui/primitives/sheet-stack';
import { useSheetStackStore } from '../../ui/primitives/sheet-stack-context';
import { seatIndexOf } from '../../ui/seat-colors';
import { actionLock, type ActionContext } from '../../view-model/action-lock';
import { selfStrip } from '../../view-model/self-strip';
import { log } from '../../view-model/log';
import { seats } from '../../view-model/seats';
import { shop } from '../../view-model/shop';
import { povHasWon } from '../../view-model/table-banner';
import { threats } from '../../view-model/threats';
import { turnClock } from '../../view-model/turn-clock';
import type { TableScreenProps } from '../table';
import { createArenaCommit } from './arena-commit';
import { arenaRegionAttributes } from './arena-regions';
import { ArenaSeats } from './arena-seats';
import {
  arenaSheetEntries,
  closeArenaSheet,
  EMPTY_ARENA_SHEETS,
  endTargeting,
  openArenaSheet,
  openSeatId,
  startTargeting,
  type ArenaSheet,
  type ArenaSheetsState,
} from './arena-sheets';
import { CardSheet } from './card-sheet';
import type { CardSheetSource } from './card-sheet-source';
import { CentralPlate } from './central-plate';
import { ChatSheet } from './chat-sheet';
import { useChatUnread } from './chat-unread-store';
import { Dock, type DockCommit } from './dock';
import { dockHasControls } from './dock-model';
import { plateDropHighlight, seatDropHighlight } from './hand-drag';
import { HandDragLayer } from './hand-drag-layer';
import { HandFan } from './hand-fan';
import { selectedHandInstanceId } from './hand-fan-model';
import { KitSheet } from './kit-sheet';
import { LogSheet } from './log-sheet';
import { LogTicker } from './log-ticker';
import { ownIntentFxFor } from './own-intent-fx';
import { SeatSheet } from './seat-sheet';
import { SelfStrip } from './self-strip';
import { ShopSheet } from './shop-sheet';
import { SubChoiceSheet } from './sub-choice/sub-choice-sheet';
import { TargetingBar } from './targeting';
import { liveTargeting } from './targeting-model';
import { ThreatLayer } from './threat-layer';
import { TopBar } from './top-bar';
import { useArenaLayoutBox } from './use-arena-layout-box';
import { useHandDrag } from './use-hand-drag';
import { useTapGuard } from './use-tap-guard';
import { useTurnStartedRecord } from './use-turn-started-record';

/** Plan A.9.1: the first widening. L74-23 adds `onReopenClaim?`, L74-25 `connectionStatus`. */
export interface ArenaScreenProps extends TableScreenProps {
  /** L74-21: the raw TURN_STARTED payload; the arena records its receive time and turnSequence (§4.1). */
  lastTurnStarted: TurnStartedPayload | null;
  /** L74-21: this room's last lobby rules (App: `cachedLobbyRules(cache, view)`, this room, Classic only; EndScreen: `view.lobbyRules ?? null`); null when unknown. */
  cachedLobbyRules: LobbyRules | null;
}

/** The FX provider shell (plan A.9.2), as `TableScreen`: the overlay draws over the arena. */
export function ArenaScreen(props: ArenaScreenProps): ReactElement {
  return (
    <TableFxProvider>
      <ArenaScreenInner {...props} />
    </TableFxProvider>
  );
}

function ArenaScreenInner(props: ArenaScreenProps): ReactElement {
  const { view } = props;
  const readOnly = props.readOnly ?? false;
  // The turn clock (§6.10, L74-21): seconds come from `view.turnDeadlineMs` only, never `props.deadlineMs`
  // (decisions 2026-10-27, L73-13); `props.nowMs` is App's 250 ms tick, so no component reads the clock.
  const turnStarted = useTurnStartedRecord({
    lastTurnStarted: props.lastTurnStarted,
    turnSequence: view.turnSequence,
    turnDeadlineMs: view.turnDeadlineMs,
    nowMs: props.nowMs,
  });
  const clock = turnClock({ turnStarted, view, cachedLobbyRules: props.cachedLobbyRules, readOnly, nowMs: props.nowMs });
  const ctx: ActionContext = { subChoice: props.subChoice, readOnly };
  const lock = actionLock(view, ctx);
  // The FX triggers both boards share (L74-17): seeded elimination beats (Q63), log chips and ghosts, threat cues.
  const fx = useTableFxTriggers({ view, lastActionResolved: props.lastActionResolved, subChoice: props.subChoice });
  // The single exit for every ArenaIntent (§6.6.4, Appendix A.6): built once per render; the handlers are read at call time.
  // Own-intent FX fly after the send (Lot 14, A.9.3).
  const commit = createArenaCommit(props, {
    onSent: (intent, context) => {
      const own = ownIntentFxFor(intent, context);
      if (own !== null) fx.ownIntent(own);
    },
  });
  // The banner host's inputs, as the V2 table maps them (`TableBannerFlash`, L51-06); L74-23 reuses `povWon`.
  const pov = view.players.find((player) => player.id === view.you);
  const povEliminated = pov?.isEliminated === true;
  const povWon = povHasWon(view.players, view.you, props.youWon ?? false);
  const povSeat = seatIndexOf(view, view.you);
  const arenaRef = useRef<HTMLDivElement>(null);
  const layoutBox = useArenaLayoutBox(arenaRef);
  const seatsModel = seats(view, layoutBox);
  const threatModel = threats(view, props.subChoice);
  // The POV strip and, in `.dock`, its dock: computed once here, L74-13 reads `strip.dock` (Appendix A.2).
  const strip = selfStrip(view, ctx);
  // The ticker and the log sheet read one model per render (§6.9, L74-15).
  const logModel = log(view);
  // The read-only sheet host (Appendix A.5): one reducer state, one component per entry.
  const [sheets, setSheets] = useState<ArenaSheetsState>(EMPTY_ARENA_SHEETS);
  // `setSheets` is stable; it is listed because the React Compiler infers it once the render also
  // calls it (the stale-targeting end below), so these callbacks still never change.
  const openSheet = useCallback((sheet: ArenaSheet): void => {
    setSheets((current) => openArenaSheet(current, sheet));
  }, [setSheets]);
  const closeSheet = useCallback((sheet: ArenaSheet): void => {
    setSheets((current) => closeArenaSheet(current, sheet));
  }, [setSheets]);
  // Every face (hand, plate, self strip, seat sheet, drop choice) opens its card sheet the same way.
  const openCard = (source: CardSheetSource): void => {
    openSheet({ kind: 'card', source });
  };
  const tappedSeatId = openSeatId(sheets);
  // The unread count lives in a page-lifetime store keyed by room, so a remount keeps it (§6.9, Q48).
  // Called unconditionally, so the hook order is stable.
  const chatUnread = useChatUnread({
    gameCode: view.gameCode,
    messageCount: view.chatMessages?.length ?? 0,
    open: sheets.open.some((sheet) => sheet.kind === 'chat'),
  });

  // Tap-tap targeting (L74-10, §6.6.2, §6.6.5): the bar and the seats read the live seat set.
  const tapGuard = useTapGuard();
  const live = liveTargeting(view, ctx, sheets);
  if (sheets.targeting !== null && live === null) {
    // Card left the hand, turn passed or a sub-choice opened (Review Focus 2). React's
    // "adjust state while rendering" pattern, as ui/primitives/sheet.tsx does; never an effect.
    setSheets(endTargeting(sheets));
  }
  const finishTargeting = (): void => {
    setSheets((current) => endTargeting(current));
    tapGuard.raise();
  };
  const onTarget = (playerId: string): void => {
    if (live?.seatIds.includes(playerId) !== true) return;
    commit({ kind: 'playCard', payload: { instanceId: live.instanceId, targetPlayerId: playerId } }, { instanceId: live.instanceId });
    finishTargeting();
  };
  // Esc cancels targeting. The collapsed sheet takes no Esc (sheet-stack.ts `escTargetId`), and an
  // expanded sheet a later task opens above the bar (the L74-13 Unspy sheet) takes it first.
  const store = useSheetStackStore();
  const onTargetingKey = useEffectEvent((event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    if (liveSheetId(store.getSnapshot()) !== null) return;
    event.preventDefault();
    finishTargeting();
  });
  const targeting = live !== null;
  // The dock's exit (L74-13): the same commit, silenced while the tap guard is up, so the second tap
  // of a double tap on the bar's Cancel or a target cannot land on Draw, Unspy or Activate duplication.
  // It says whether the send went out, so the dock latches only a real send (final review, R2).
  const dockCommit: DockCommit = (intent) => {
    if (tapGuard.guarded) return false;
    commit(intent);
    return true;
  };

  // Drag from the hand (L74-12, §6.6.3): exclusive with targeting; a pre-send choice opens the card sheet.
  const handDrag = useHandDrag({
    view,
    ctx,
    targetingActive: targeting,
    commit,
    openChoice: openCard,
  });
  const dragging = handDrag.view?.phase === 'dragging' ? handDrag.view : null;

  useEffect(() => {
    if (!targeting) return;
    const listener = (event: KeyboardEvent): void => {
      onTargetingKey(event);
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [targeting]);

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
          onOpenLog={() => {
            openSheet({ kind: 'log' });
          }}
          onOpenChat={() => {
            openSheet({ kind: 'chat' });
          }}
          chatUnread={chatUnread}
          clock={clock}
        />
      </div>
      <div {...arenaRegionAttributes('ticker')} className="shrink-0 px-2">
        <LogTicker
          line={logModel.ticker}
          view={view}
          onOpen={() => {
            openSheet({ kind: 'log' });
          }}
        />
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
            // The second tap of a double tap that ended targeting lands here once the bar is gone.
            if (tapGuard.guarded) return;
            openSheet({ kind: 'seat', playerId });
          }}
          {...(live === null ? {} : { targeting: { key: live.sheetKey, seatIds: live.seatIds, onTarget } })}
          {...(dragging === null ? {} : { dropHighlight: seatDropHighlight(dragging.zones, dragging.hover) })}
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
          onOpenCard={openCard}
          dropHighlight={dragging === null ? null : plateDropHighlight(dragging.zones, dragging.hover)}
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
            onOpenCard={openCard}
          />
        )}
      </div>
      <div {...arenaRegionAttributes('hand')} data-zone="card-band" className="min-w-0 shrink-0">
        <HandFan
          view={view}
          ctx={ctx}
          selectedInstanceId={selectedHandInstanceId(sheets)}
          onOpenCard={openCard}
          drag={handDrag.fanProps}
        />
      </div>
      <div {...arenaRegionAttributes('dock')} data-zone="dock" className="shrink-0 px-2 pb-2">
        {/* A walk-in has no controls (Q38): the region stays, empty. An eliminated Watching POV keeps the disabled dock (A.8 ruling 7). */}
        {dockHasControls(strip.dock) ? (
          <Dock
            model={strip.dock}
            isMyTurn={strip.isActive}
            turnSequence={view.turnSequence}
            view={view}
            commit={dockCommit}
            actionReject={props.actionReject}
            onOpenShop={() => {
              // The second tap of a double tap on the targeting bar's Cancel lands here once the bar is gone, as on a seat.
              if (tapGuard.guarded) return;
              openSheet({ kind: 'shop' });
            }}
          />
        ) : null}
      </div>
      {/* Portaled to `document.body` on `Z_INDEX.dragGhost`, under every sheet (Appendix A.8 ruling 10). */}
      <HandDragLayer drag={handDrag.view} />
      {/* Portaled to `document.body` on `Z_INDEX.banner`, mounted once (§6.12, L74-17). `seatIndexOf` is null for a walk-in, as in V2. */}
      <TableBannerHost
        isMyTurn={view.currentTurnPlayerId === view.you && !readOnly && !povEliminated && !povWon}
        isEliminated={povEliminated}
        youWon={povWon}
        pendingEffects={view.pendingEffects}
        sentenceAnnouncements={view.actionLog.filter(
          (entry): entry is SentenceAnnouncementLogEntry =>
            entry.kind === 'sentenceCountdown' || entry.kind === 'sentenceFired',
        )}
        actionLog={view.actionLog}
        nicknameOf={(id) => view.players.find((player) => player.id === id)?.nickname ?? id}
        you={view.you}
        {...(povSeat !== null ? { seatColor: v7SeatColor(povSeat) } : {})}
      />
      {/* The sheets are the last children of the arena root and never inside a clickable element: a React portal bubbles clicks to its ancestors. No `default`, so a new `ArenaSheet` variant fails `noImplicitReturns` until it gets a case. */}
      {arenaSheetEntries(sheets).map(({ sheet, key, open }) => {
        switch (sheet.kind) {
          case 'card': {
            // Always a boolean: re-tapping the lifted hand card ends targeting and reopens this sheet
            // in one reducer step (no `open={false}` in between), and only `false` un-collapses it.
            const collapsed = live?.sheetKey === key;
            return (
              <CardSheet
                key={key}
                open={open}
                source={sheet.source}
                view={view}
                ctx={ctx}
                commit={commit}
                onBeginTargeting={(request) => {
                  setSheets((current) => startTargeting(current, { sheetKey: key, ...request }));
                }}
                collapsed={collapsed}
                {...(collapsed ? { collapsedBar: <TargetingBar onCancel={finishTargeting} /> } : {})}
                onClose={() => {
                  closeSheet(sheet);
                }}
              />
            );
          }
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
                onOpenCard={openCard}
              />
            );
          }
          case 'shop': {
            // The arena's own `ctx`, never a fresh context, so L74-25's `ctx.reconnecting` reaches every Buy (S7).
            const model = shop(view, ctx);
            return (
              <ShopSheet
                key={key}
                open={open}
                model={model}
                initialTab={sheet.tab ?? model.initialTab}
                view={view}
                actionReject={props.actionReject}
                commit={commit}
                onOpenCard={openCard}
                onClose={() => {
                  closeSheet(sheet);
                }}
              />
            );
          }
          case 'log':
            return (
              <LogSheet
                key={key}
                open={open}
                view={view}
                model={logModel}
                onOpenCard={openCard}
                onClose={() => {
                  closeSheet(sheet);
                }}
              />
            );
          case 'chat':
            // Chat is App-level: `onSendChat` is called directly, never through `commit` (Appendix A.6).
            return (
              <ChatSheet
                key={key}
                open={open}
                view={view}
                readOnly={readOnly}
                onSend={props.onSendChat}
                onClose={() => {
                  closeSheet(sheet);
                }}
              />
            );
        }
      })}
      {/* Outside the read-only reducer (plan A.9.4): one blocking sheet, above every read-only sheet. L74-25 adds `locked`. */}
      <SubChoiceSheet
        subChoice={props.subChoice}
        view={view}
        nowMs={props.nowMs}
        commit={commit}
        actionReject={props.actionReject}
      />
    </main>
  );
}
