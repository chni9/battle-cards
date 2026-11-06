/**
 * Finished phase — closable stats over the frozen board (designer 2026-08-06).
 * Game over Dialog opens after the L51-06 win/death banner (~1.6s).
 * PROTOCOL_VERSION 24 · `FinishedStateView.finalTable`.
 * One FeedbackDialog owned here so stats / ask / turn-strip `!` never stack (L47-03).
 * Finished hub leave goes through ask-once (L57-03).
 * The finished board is the V7 arena on `finalTable` (technical spec v7 §4.4, §6.12; L75-09).
 */

import type { FinishedStateView } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { hasAskedFeedback, markFeedbackAsked } from '../feedback/asked-storage';
import { FeedbackDialog } from '../feedback/feedback-dialog';
import type { ActionRejectPayload, RoomConnectionStatus } from '../net/use-room-connection';
import {
  canOpenEndManualFeedback,
  canOpenEndStatsFeedback,
  canReopenEndStats,
  finishedHubLeaveAction,
  finishedHubPlayAgainAction,
  isEndStatsOpen,
  shouldAskFeedbackAfterStatsClose,
  shouldLeaveAfterAskDismiss,
  shouldMarkEndFeedbackAsked,
  shouldPlayAgainAfterAskDismiss,
  type EndFeedbackMode,
} from './end-feedback';
import { ArenaScreen, type ArenaScreenProps } from './arena/arena-screen';
import { GameOverDialog } from './game-over-dialog';
import { TABLE_BANNER_MS } from '../view-model/table-banner';

export interface EndScreenProps {
  view: FinishedStateView;
  actionReject: ActionRejectPayload | null;
  onDismissActionReject: () => void;
  statusLabel: string;
  nowMs: number;
  onLeave: () => void;
  onPlayAgain?: () => void;
  /** L74-25: the raw connection status for the arena board; 'connected' when omitted. */
  connectionStatus?: RoomConnectionStatus;
}

const noop = (): void => {
  /* finished board is inspect-only */
};

export function EndScreen({
  view,
  actionReject,
  onDismissActionReject,
  statusLabel,
  nowMs,
  onLeave,
  onPlayAgain,
  connectionStatus = 'connected',
}: EndScreenProps): ReactElement {
  const [bannerElapsed, setBannerElapsed] = useState(false);
  const [statsDismissed, setStatsDismissed] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<EndFeedbackMode>('ask');
  const [leavePending, setLeavePending] = useState(false);
  const [playAgainPending, setPlayAgainPending] = useState(false);
  const youWon = view.winnerPlayerId === view.finalTable.you;
  const youNick = view.players.find((player) => player.id === view.you)?.nickname;
  const statsOpen = isEndStatsOpen({
    bannerElapsed,
    statsDismissed,
    feedbackOpen,
  });

  const onStatsClose = (): void => {
    setStatsDismissed(true);
    if (
      shouldAskFeedbackAfterStatsClose({
        alreadyAsked: hasAskedFeedback(view.gameCode),
        feedbackOpen,
      })
    ) {
      setFeedbackMode('ask');
      setFeedbackOpen(true);
    }
  };

  const onOpenManualFeedback = (): void => {
    if (!canOpenEndManualFeedback({ statsOpen, feedbackOpen })) {
      return;
    }
    setFeedbackMode('manual');
    setFeedbackOpen(true);
  };

  const onOpenStatsFeedback = (): void => {
    if (!canOpenEndStatsFeedback({ feedbackOpen })) {
      return;
    }
    setStatsDismissed(true);
    setFeedbackMode('manual');
    setFeedbackOpen(true);
  };

  const requestLeave = (): void => {
    setPlayAgainPending(false);
    if (finishedHubLeaveAction(hasAskedFeedback(view.gameCode)) === 'leaveNow') {
      onLeave();
      return;
    }
    setStatsDismissed(true);
    setFeedbackMode('ask');
    setLeavePending(true);
    setFeedbackOpen(true);
  };

  const requestPlayAgain = (): void => {
    if (onPlayAgain === undefined) {
      return;
    }
    setLeavePending(false);
    if (finishedHubPlayAgainAction(hasAskedFeedback(view.gameCode)) === 'playAgainNow') {
      onPlayAgain();
      return;
    }
    setStatsDismissed(true);
    setFeedbackMode('ask');
    setPlayAgainPending(true);
    setFeedbackOpen(true);
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      setBannerElapsed(true);
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  // The finished board is the arena on `finalTable` (§6.12, L74-24, L75-09). The two attributes stay JSX:
  // `end.feedback-surfaces.test.ts` reads them.
  const finishedBoard: Omit<ArenaScreenProps, 'onOpenFeedback' | 'onLeave'> = {
    view: view.finalTable,
    actionReject,
    onDismissActionReject,
    statusLabel,
    nowMs,
    deadlineMs: null,
    lastActionResolved: null,
    subChoice: null,
    readOnly: true,
    youWon,
    onShowStats: () => {
      if (!canReopenEndStats({ feedbackOpen })) {
        return;
      }
      setStatsDismissed(false);
    },
    onDraw: noop,
    onPlayCard: noop,
    onPlayMultipleAttacks: noop,
    onResolveSubChoice: noop,
    onBuyCard: noop,
    onSellCard: noop,
    onUpgradeCard: noop,
    onBuyUpgradePoint: noop,
    onBuySpecialCard: noop,
    onBuyPoolCard: noop,
    onClearSpy: noop,
    onSellUpgradePoint: noop,
    onForfeit: noop,
    onSendChat: noop,
    lastTurnStarted: null,
    cachedLobbyRules: view.lobbyRules ?? null,
    connectionStatus,
  };

  return (
    <>
      <ArenaScreen {...finishedBoard} onOpenFeedback={onOpenManualFeedback} onLeave={requestLeave} />
      <GameOverDialog
        open={statsOpen}
        view={view}
        onClose={onStatsClose}
        onLeave={requestLeave}
        {...(onPlayAgain !== undefined ? { onPlayAgain: requestPlayAgain } : {})}
        onOpenFeedback={onOpenStatsFeedback}
      />
      <FeedbackDialog
        open={feedbackOpen}
        mode={feedbackMode}
        screen="end"
        {...(youNick !== undefined ? { nickname: youNick } : {})}
        gameCode={view.gameCode}
        playKind={view.playKind}
        actionLog={view.finalTable.actionLog}
        onDismiss={(reason) => {
          if (shouldMarkEndFeedbackAsked(reason)) {
            markFeedbackAsked(view.gameCode);
          }
          const pendingLeave = leavePending;
          const pendingPlayAgain = playAgainPending;
          setLeavePending(false);
          setPlayAgainPending(false);
          setFeedbackOpen(false);
          if (shouldLeaveAfterAskDismiss({ leavePending: pendingLeave, reason })) {
            onLeave();
            return;
          }
          if (
            onPlayAgain !== undefined &&
            shouldPlayAgainAfterAskDismiss({ playAgainPending: pendingPlayAgain, reason })
          ) {
            onPlayAgain();
          }
        }}
      />
    </>
  );
}
