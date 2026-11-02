/**
 * Arena top bar — technical spec v7 §6.1 item 1 and §6.12; Lot 74 plan L74-03 and Appendix A.8
 * rulings 2 and 3.
 *
 * - Left: the round, the turn banner (`Your turn`, `{Nick}'s turn` with the nickname in its seat
 *   hue, or `—`), the active seat's Block line and the empty clock slot L74-21 fills (§6.10). Seat
 *   names stand on `--panel`, never on the ground (`ui/seat/player-name.tsx`).
 * - Right: Feedback `!`, the flag and Menu, each a 44 px icon-only `IconButton` named by its
 *   aria-label (§5.6). L74-16 puts Chat before Feedback. The menu body lives in `menu-sheet.tsx`
 *   (L74-15), owner-local here; its Action log entry opens the arena's log sheet (§6.9).
 * - The flag opens the confirm for the live `tableFlagIntent(...)` (decisions.md 2026-10-28), and
 *   only the confirm button calls `onForfeit` / `onLeave` (§6.6.4, L43-05). Those are App-level
 *   actions, not `ArenaIntent`s, so they leave outside the commit helper.
 * - The finished board hands Feedback to its parent (`onOpenFeedback`, L47-03); the live arena
 *   owns its `FeedbackDialog`.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useRef, useState, type ReactElement } from 'react';

import { FeedbackDialog } from '../../feedback/feedback-dialog';
import { markHowToPlaySeen } from '../../ui/help-storage';
import { CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { IconButton } from '../../ui/primitives/icon-button';
import { PlayerName } from '../../ui/seat/player-name';
import { FEEDBACK_ARIA_LABEL } from '../../view-model/table-copy';
import { HowToPlayDialog } from '../how-to-play-dialog';
import { LeaveConfirmSheet } from './leave-confirm-sheet';
import { MenuSheet } from './menu-sheet';
import {
  activeBlockLabel,
  arenaFlag,
  MENU_LABEL,
  topBarRoundLabel,
  turnBannerOf,
  turnBannerText,
} from './top-bar-model';

export interface TopBarProps {
  view: PlayingStateView;
  readOnly: boolean;
  /** `STATUS_LABELS[status]` from App: the POV's connection label (Appendix A `global-status-labels`). */
  statusLabel: string;
  onLeave: () => void;
  /** Alive Classic flag confirm: FORFEIT, the socket stays (L43-06). */
  onForfeit: () => void;
  /** Finished board: Game over owns Feedback (L47-03). The live arena omits it and owns its dialog. */
  onOpenFeedback?: () => void;
  /** L74-15: the menu's Action log entry (spec v7 §6.9). */
  onOpenLog?: () => void;
}

export function TopBar({ view, readOnly, statusLabel, onLeave, onForfeit, onOpenFeedback, onOpenLog }: TopBarProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /**
   * Latches the first confirm press. A state guard is not enough: while the Dialog exits,
   * `AnimatePresence` keeps rendering its last element with its stale props
   * (`ui/primitives/presence-layer.tsx`), so a second synchronous click runs the old closure,
   * where `confirmOpen` is still true. A ref is read at call time (decisions.md 2026-10-28).
   */
  const confirmed = useRef(false);

  const banner = turnBannerOf(view);
  const bannerText = turnBannerText(banner);
  const block = activeBlockLabel(view);
  const flag = arenaFlag(view, readOnly);
  const self = view.players.find((player) => player.isYou);

  const confirmLeave = (): void => {
    if (confirmed.current || flag === null) {
      return;
    }
    confirmed.current = true;
    setConfirmOpen(false);
    if (flag.intent === 'forfeit') {
      onForfeit();
    } else {
      onLeave();
    }
  };

  return (
    <>
      <div className="flex items-start gap-2">
        <div data-top-bar="turn" className={`min-w-0 flex-1 bg-v7-panel px-3 py-1.5 ${CHROME_SHAPE_SM_CLASS}`}>
          <p data-top-bar="round" className="font-v7-body text-v7-caption font-bold text-v7-text-2">
            {topBarRoundLabel(view)}
          </p>
          <h2 data-top-bar="banner" title={bannerText} className="truncate font-v7-display text-v7-title leading-tight text-v7-text">
            {banner.kind === 'seat' ? (
              <>
                <PlayerName nickname={banner.nickname} playerId={banner.playerId} view={view} possessive /> turn
              </>
            ) : (
              bannerText
            )}
          </h2>
          {block !== null ? (
            <p data-top-bar="block" className="font-v7-body text-v7-caption font-bold text-v7-text-2">
              {block}
            </p>
          ) : null}
          {/* Clock slot: L74-21 (spec v7 §6.10). */}
          <div data-zone="timers" data-hint-anchor="your-turn" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            aria-label={FEEDBACK_ARIA_LABEL}
            aria-haspopup="dialog"
            icon="feedback"
            onClick={() => {
              if (onOpenFeedback !== undefined) {
                onOpenFeedback();
              } else {
                setFeedbackOpen(true);
              }
            }}
          />
          {flag !== null ? (
            <IconButton
              aria-label={flag.ariaLabel}
              aria-haspopup="dialog"
              icon="flag"
              onClick={() => {
                confirmed.current = false;
                setConfirmOpen(true);
              }}
            />
          ) : null}
          <IconButton
            aria-label={MENU_LABEL}
            aria-haspopup="dialog"
            icon="menu"
            onClick={() => {
              setMenuOpen(true);
            }}
          />
        </div>
      </div>
      <MenuSheet
        open={menuOpen}
        view={view}
        statusLabel={statusLabel}
        onClose={() => {
          setMenuOpen(false);
        }}
        onHowToPlay={() => {
          setHowToPlayOpen(true);
        }}
        {...(onOpenLog !== undefined ? { onOpenLog } : {})}
      />
      {flag !== null ? (
        <LeaveConfirmSheet
          open={confirmOpen}
          intent={flag.intent}
          onStay={() => {
            setConfirmOpen(false);
          }}
          onConfirm={confirmLeave}
        />
      ) : null}
      <HowToPlayDialog
        open={howToPlayOpen}
        onClose={(reason) => {
          if (reason === 'skip' || reason === 'got-it') {
            markHowToPlaySeen();
          }
          setHowToPlayOpen(false);
        }}
      />
      {onOpenFeedback === undefined ? (
        <FeedbackDialog
          open={feedbackOpen}
          mode="manual"
          screen="table"
          gameCode={view.gameCode}
          playKind={view.playKind}
          actionLog={view.actionLog}
          {...(self !== undefined ? { nickname: self.nickname } : {})}
          onDismiss={() => {
            setFeedbackOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
