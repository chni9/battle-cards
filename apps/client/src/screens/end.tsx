/**
 * Finished phase — closable stats over the frozen board (designer 2026-08-06).
 * Game over Dialog opens after the L51-06 win/death banner (~1.6s).
 * PROTOCOL_VERSION 24 · `FinishedStateView.finalTable`.
 * One FeedbackDialog owned here so stats / ask / turn-strip `!` never stack (L47-03).
 */

import type { FinishedStateView } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { hasAskedFeedback, markFeedbackAsked } from '../feedback/asked-storage';
import { FeedbackDialog } from '../feedback/feedback-dialog';
import type { ActionRejectPayload } from '../net/use-room-connection';
import {
  canOpenEndManualFeedback,
  canReopenEndStats,
  shouldAskFeedbackAfterStatsClose,
  shouldAutoOpenStats,
  shouldMarkEndFeedbackAsked,
  type EndFeedbackMode,
} from './end-feedback';
import { GameOverDialog } from './game-over-dialog';
import { TableScreen } from './table';
import { TABLE_BANNER_MS } from './table/table-banner';

export interface EndScreenProps {
  view: FinishedStateView;
  actionReject: ActionRejectPayload | null;
  onDismissActionReject: () => void;
  statusLabel: string;
  nowMs: number;
  onLeave: () => void;
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
}: EndScreenProps): ReactElement {
  const [statsOpen, setStatsOpen] = useState(false);
  const [autoStatsShown, setAutoStatsShown] = useState(false);
  const [bannerElapsed, setBannerElapsed] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<EndFeedbackMode>('ask');
  const youWon = view.winnerPlayerId === view.finalTable.you;
  const youNick = view.players.find((player) => player.id === view.you)?.nickname;

  const onStatsClose = (): void => {
    setStatsOpen(false);
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

  useEffect(() => {
    const id = window.setTimeout(() => {
      setBannerElapsed(true);
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (
      !shouldAutoOpenStats({
        bannerElapsed,
        autoStatsShown,
        feedbackOpen,
      })
    ) {
      return;
    }
    setStatsOpen(true);
    setAutoStatsShown(true);
  }, [autoStatsShown, bannerElapsed, feedbackOpen]);

  return (
    <>
      <TableScreen
        view={view.finalTable}
        actionReject={actionReject}
        onDismissActionReject={onDismissActionReject}
        statusLabel={statusLabel}
        nowMs={nowMs}
        deadlineMs={null}
        lastActionResolved={null}
        subChoice={null}
        readOnly
        youWon={youWon}
        onOpenFeedback={onOpenManualFeedback}
        onShowStats={() => {
          if (!canReopenEndStats({ feedbackOpen })) {
            return;
          }
          setStatsOpen(true);
        }}
        onDraw={noop}
        onPlayCard={noop}
        onPlayMultipleAttacks={noop}
        onResolveSubChoice={noop}
        onBuyCard={noop}
        onSellCard={noop}
        onUpgradeCard={noop}
        onBuyUpgradePoint={noop}
        onBuySpecialCard={noop}
        onSellUpgradePoint={noop}
        onLeave={onLeave}
        onForfeit={noop}
      />
      <GameOverDialog
        open={statsOpen}
        view={view}
        onClose={onStatsClose}
        onLeave={onLeave}
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
          setFeedbackOpen(false);
        }}
      />
    </>
  );
}
