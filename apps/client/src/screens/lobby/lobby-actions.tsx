/**
 * The lobby action bar (technical spec v7 §7.2; §11 Q39, a grey control says why; parity
 * `lobby-action-row`, `global-feedback-entry-points`). Sticky at the bottom of the lobby's
 * scrolling `main`, so Start and Ready stay on screen with eight seats. The host gets Start,
 * grey with `lobbyStartReason` (the server's reject words) until `lobbyStartEnabled`; a human
 * guest gets one Ready (primary, `check` icon) / Cancel ready (secondary) button and its hint;
 * a walk-in reads the waiting hint. Leave is immediate and Feedback opens the V2 manual
 * `FeedbackDialog` until L76-07. `locked` (reconnecting) disables Start and Ready; Leave and
 * Feedback stay live (plan A.9 ruling 6). L76-12.
 */

import type { LobbyStateView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { FeedbackDialog } from '../../feedback/feedback-dialog';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS } from '../../ui/primitives/chrome-classes';
import {
  CANCEL_READY_LABEL,
  FEEDBACK_LABEL,
  LEAVE_LABEL,
  PRESS_READY_HINT,
  READY_BUTTON_LABEL,
  START_LABEL,
  WAITING_FOR_HOST_HINT,
} from './lobby-copy';
import { lobbyShowsReadyToggle, lobbyStartEnabled } from './lobby-ready';
import { lobbyStartReason } from './lobby-seat-model';

export interface LobbyActionsProps {
  readonly view: LobbyStateView;
  /** Reconnecting: Start and Ready / Cancel ready are disabled; Leave and Feedback stay live. */
  readonly locked: boolean;
  readonly onStart: () => void;
  readonly onSetReady: (ready: boolean) => void;
  readonly onLeave: () => void;
}

export function LobbyActions({ view, locked, onStart, onSetReady, onLeave }: LobbyActionsProps): ReactElement {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const isHost = view.hostPlayerId === view.you;
  const showReadyToggle = lobbyShowsReadyToggle(view);
  const you = view.players.find((player) => player.id === view.you);
  const youReady = you?.isReady === true;
  const youNick = you?.nickname;
  const canLaunch = lobbyStartEnabled(view);
  const startReason = lobbyStartReason(view);

  return (
    <>
      <div
        data-lobby-actions
        className={`sticky bottom-3 z-10 mt-auto flex flex-col gap-2 ${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}
      >
        {!isHost ? (
          <p className="font-v7-body text-v7-body font-bold text-v7-text-2">
            {!showReadyToggle || youReady ? WAITING_FOR_HOST_HINT : PRESS_READY_HINT}
          </p>
        ) : null}
        <div className="flex flex-wrap items-start gap-2">
          {isHost ? (
            // The reason is always a string, so the tree is stable; it shows only while disabled.
            <Button
              variant="primary"
              disabled={locked || !canLaunch}
              focusableWhenDisabled
              disabledReason={startReason ?? ''}
              onClick={onStart}
            >
              {START_LABEL}
            </Button>
          ) : null}
          {showReadyToggle ? (
            // One element for both states, so the toggle keeps its focus.
            <Button
              variant={youReady ? 'secondary' : 'primary'}
              {...(youReady ? {} : { icon: 'check' as const })}
              disabled={locked}
              focusableWhenDisabled
              onClick={() => {
                onSetReady(!youReady);
              }}
            >
              {youReady ? CANCEL_READY_LABEL : READY_BUTTON_LABEL}
            </Button>
          ) : null}
          <Button variant="danger" onClick={onLeave}>
            {LEAVE_LABEL}
          </Button>
          <Button
            variant="quiet"
            icon="feedback"
            onClick={() => {
              setFeedbackOpen(true);
            }}
          >
            {FEEDBACK_LABEL}
          </Button>
        </div>
      </div>
      <FeedbackDialog
        open={feedbackOpen}
        mode="manual"
        screen="lobby"
        gameCode={view.gameCode}
        {...(youNick !== undefined ? { nickname: youNick } : {})}
        onDismiss={() => {
          setFeedbackOpen(false);
        }}
      />
    </>
  );
}
