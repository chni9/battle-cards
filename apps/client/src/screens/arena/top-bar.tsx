/**
 * Arena top bar — technical spec v7 §6.1 item 1 and §6.12; Lot 74 plan L74-03 and Appendix A.8
 * rulings 2 and 3.
 *
 * - Left: the round, the turn banner (`Your turn`, `{Nick}'s turn` with the nickname in its seat
 *   hue, or `—`), the active seat's Block line and the turn clock (`TurnClock`, §6.10, L74-21). Seat
 *   names stand on `--panel`, never on the ground (`ui/seat/player-name.tsx`).
 * - Right: Chat, Feedback `!`, the flag and Menu, each a 44 px icon-only `IconButton` named by its
 *   aria-label (§5.6). Chat comes first (L74-16) and carries the unread badge; it opens the arena's
 *   chat sheet (§6.9). The menu body lives in `menu-sheet.tsx` (L74-15), owner-local here; its
 *   Action log entry opens the arena's log sheet (§6.9), and its Table rules entry (L74-22, only
 *   while the rules are known) the rules sheet (§6.11).
 * - The flag opens the confirm for the live `tableFlagIntent(...)` (decisions.md 2026-10-28), and
 *   only the confirm button calls `onForfeit` / `onLeave` (§6.6.4, L43-05). Those are App-level
 *   actions, not `ArenaIntent`s, so they leave outside the commit helper.
 * - L74-23 (plan A.9.4): each new `confirmRequest` value opens the same confirm as a flag tap, so
 *   the Watching strip's Leave table reaches it.
 * - The finished board hands Feedback to its parent (`onOpenFeedback`, L47-03); the live arena
 *   owns its `FeedbackDialog`.
 * - L75-04 (§6.12; plan A.8.3, A.8.6): `tutorialHighlight` marks the turn card (`timer`) or the flag
 *   (`flag`) for the board tour, and `onShowCoach` adds Menu → Show coach while the coach is hidden.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useRef, useState, type ReactElement } from 'react';

import { FeedbackDialog } from '../../feedback/feedback-dialog';
import { markHowToPlaySeen } from '../../ui/help-storage';
import { CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { IconButton } from '../../ui/primitives/icon-button';
import { PlayerName } from '../../ui/seat/player-name';
import { FEEDBACK_ARIA_LABEL } from '../../view-model/table-copy';
import type { TurnClockModel } from '../../view-model/turn-clock';
import { HowToPlayDialog } from '../how-to-play-dialog';
import { LeaveConfirmSheet } from './leave-confirm-sheet';
import { MenuSheet } from './menu-sheet';
import {
  activeBlockLabel,
  arenaFlag,
  chatAriaLabel,
  MENU_LABEL,
  topBarRoundLabel,
  turnBannerOf,
  turnBannerText,
} from './top-bar-model';
import { TurnClock } from './turn-clock';

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
  /** L74-22: Table rules; absent while the rules are unknown (spec v7 §6.11). */
  onOpenRules?: () => void;
  /** L74-16: the Chat icon, first in the right row, and its unread badge (spec v7 §6.1 item 1, §6.9). */
  onOpenChat?: () => void;
  /** Default 0. */
  chatUnread?: number;
  /** L74-21: `turnClock(...)`, computed once in `ArenaScreenInner` (Appendix A.2); rendered in the `timers` slot (§6.10). */
  clock: TurnClockModel;
  /** Each new value opens the leave confirm as a flag tap does (the Watching strip's Leave table). */
  confirmRequest?: number;
  /** L75-04: Menu → Show coach, passed only while the tutorial coach is hidden (plan A.8.3). */
  onShowCoach?: () => void;
  /** L75-04: the board tour's mark on the turn card (`timer`) or the flag (`flag`); absent or null, none. */
  tutorialHighlight?: 'timer' | 'flag' | null;
}

export function TopBar({
  view,
  readOnly,
  statusLabel,
  onLeave,
  onForfeit,
  onOpenFeedback,
  onOpenLog,
  onOpenRules,
  onOpenChat,
  chatUnread = 0,
  clock,
  confirmRequest,
  onShowCoach,
  tutorialHighlight = null,
}: TopBarProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  /** The leave confirm, and how many times it has opened: each open is a new epoch (L74-23, D11). */
  const [confirm, setConfirm] = useState<{ readonly open: boolean; readonly epoch: number }>({ open: false, epoch: 0 });
  const request = confirmRequest ?? 0;
  const [seenRequest, setSeenRequest] = useState(request);
  /**
   * The confirm epoch that already sent: one press per open. A state guard is not enough: while
   * the Dialog exits, `AnimatePresence` keeps rendering its last element with its stale props
   * (`ui/primitives/presence-layer.tsx`), so a second synchronous click runs the old closure,
   * where the confirm is still open. That stale closure carries the same epoch, and a ref is read
   * at call time (decisions.md 2026-10-28). It is read and written only in `confirmLeave`, never
   * during render (the React Compiler lint); a reopened confirm has a new epoch, so it sends again.
   */
  const sentEpoch = useRef<number | null>(null);
  const openConfirm = (): void => {
    setConfirm((current) => ({ open: true, epoch: current.epoch + 1 }));
  };

  const banner = turnBannerOf(view, readOnly);
  const bannerText = turnBannerText(banner);
  const block = activeBlockLabel(view);
  const flag = arenaFlag(view, readOnly);
  const self = view.players.find((player) => player.isYou);

  // A new `confirmRequest` opens the confirm as a flag tap does (React's "adjust state while
  // rendering" pattern, never an effect). With no flag there is nothing to confirm.
  if (request !== seenRequest) {
    setSeenRequest(request);
    if (flag !== null) {
      setConfirm((current) => ({ open: true, epoch: current.epoch + 1 }));
    }
  }

  const confirmLeave = (): void => {
    if (sentEpoch.current === confirm.epoch || flag === null) {
      return;
    }
    sentEpoch.current = confirm.epoch;
    setConfirm((current) => ({ ...current, open: false }));
    if (flag.intent === 'forfeit') {
      onForfeit();
    } else {
      onLeave();
    }
  };

  return (
    <>
      <div className="flex items-start gap-2">
        <div
          data-top-bar="turn"
          {...(tutorialHighlight === 'timer' ? { 'data-tutorial-highlight': 'timer' } : {})}
          className={`min-w-0 flex-1 bg-v7-panel px-3 py-1.5 ${CHROME_SHAPE_SM_CLASS}`}>
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
          <div data-zone="timers" data-hint-anchor="your-turn">
            <TurnClock model={clock} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onOpenChat !== undefined ? (
            <IconButton
              aria-label={chatAriaLabel(chatUnread)}
              aria-haspopup="dialog"
              icon="chat"
              count={chatUnread}
              onClick={onOpenChat}
            />
          ) : null}
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
              {...(tutorialHighlight === 'flag' ? { 'data-tutorial-highlight': 'flag' } : {})}
              onClick={openConfirm}
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
        {...(onShowCoach !== undefined ? { onShowCoach } : {})}
        {...(onOpenLog !== undefined ? { onOpenLog } : {})}
        {...(onOpenRules !== undefined ? { onOpenRules } : {})}
      />
      {flag !== null ? (
        <LeaveConfirmSheet
          open={confirm.open}
          intent={flag.intent}
          onStay={() => {
            setConfirm((current) => ({ ...current, open: false }));
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
