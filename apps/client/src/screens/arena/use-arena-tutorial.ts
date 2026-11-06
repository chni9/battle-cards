/**
 * The tutorial on the arena — technical spec v7 §6.12 (the coach, the tour, the Look gate, the
 * highlights), §6.6.3 (the locks), §14.3; Lot 75 plan Appendix A.8.2 (L75-04; R7, K4).
 *
 * V2's tutorial state lives here, inside `ArenaScreenInner` (R7): the board tour step, whether the
 * revealed opponent's sheet was opened (the Look gate), the index the coach went idle on, and the
 * coach key the player hid. Every rule it reads is a pure helper in `view-model/tutorial-coach-copy.ts`
 * or `packages/shared/src/tutorial/`; this hook only keeps the state V2 kept in `table.tsx`.
 *
 * - **Coach (§6.12).** Tour copy, then the Look copy, then the script copy (bot turns keep the last
 *   lesson). On the POV's turn, outside the locks, the title turns 'Play' after `TUTORIAL_IDLE_MS`
 *   (V2 `table.tsx:539-566`). Hiding stores the message key, so new copy reopens the coach.
 * - **Locks (§6.6.3; open questions 8 and 9).** While the tour or the Look gate is up, `locksTable`
 *   holds every send (`allows`), and the shell withholds drags, Shop, Unspy and hand taps.
 * - **The Look exit.** Opening the seat sheet of a seat whose kit is visible clears the gate, once per
 *   mount (`onSeatOpened`).
 * - **`allows`** is the tutorial half of the commit's `allow` (A.8.4). The locks veto silently (L75-04).
 *   Outside them a sub-choice answer always passes (open-question ruling 8, K5), and any other send the
 *   step does not ask for (`tutorialSendAllowed` over `tutorialIntentOf`) is vetoed and records the
 *   index, so the coach shows `ILLEGAL_ACTION_COPY['tutorial-follow-coach']` until an allowed send or
 *   a new index clears it (L75-05; V2 precedence). The follow-coach copy keeps the `script` key phase,
 *   so a veto reopens a hidden coach (V2).
 */

import {
  isTutorialLookPending,
  isTutorialTourActive,
  tutorialTourStepAt,
  type CardId,
  type PlayingStateView,
  type TutorialHighlight,
  type TutorialTourHighlight,
} from '@card-battle/shared';
import { useEffect, useState } from 'react';

import { seatList } from '../../view-model/seats';
import {
  isTutorialCoachOpen,
  resolveTutorialPresentationCoach,
  tutorialCoachMessageKey,
  tutorialCoachTitle,
  tutorialHighlightAt,
  tutorialSendAllowed,
  TUTORIAL_IDLE_MS,
  type TutorialCardActionSpotlight,
} from '../../view-model/tutorial-coach-copy';
import { resolveIllegalActionCopy } from '../illegal-action-copy';
import type { ArenaIntent } from './arena-commit';
import { tutorialIntentOf } from './tutorial-gate';

/** Every `data-tutorial-highlight` value on the arena (plan A.8.6; the map in `docs/backlog_v7.md` › §6.12). */
export type ArenaTutorialHighlightId =
  | TutorialTourHighlight
  | 'draw'
  | 'shop'
  | TutorialCardActionSpotlight
  | 'shop-upgrade-point'
  | 'shop-absorber'
  | 'shop-absorber-buy'
  | 'opponent-portrait'
  | CardId;

export interface ArenaTutorialInput {
  readonly view: PlayingStateView;
  readonly readOnly: boolean;
  /** `view.currentTurnPlayerId === view.you` (the idle timer runs only then). */
  readonly isMyTurn: boolean;
  /** The POV is eliminated (no idle timer). */
  readonly selfEliminated: boolean;
}

export interface ArenaCoachView {
  readonly index: number;
  /** Tour / Look copy, else the follow-coach copy after a veto, else the script copy; 'Play' after 20 s idle (`tutorialCoachTitle`). */
  readonly title: string;
  readonly body: string;
  /** `${'tour:N' | 'look' | 'script'}|${tutorialCoachMessageKey(index, title, body)}`, as V2. */
  readonly messageKey: string;
  /** `isTutorialCoachOpen(messageKey, dismissedKey)`: new copy reopens it. */
  readonly open: boolean;
  /** Tour steps only: the Got it footer. */
  readonly showAck: boolean;
  /** `tourActive`: the table is locked for the board tour, so the coach may leave the arena (`placeCoach`, S-B1). */
  readonly tour: boolean;
}

export interface ArenaTutorial {
  /** `view.playKind === 'tutorial' && !readOnly && view.tutorialIndex !== null`. */
  readonly active: boolean;
  readonly index: number | null;
  readonly tourStep: number;
  /** `isTutorialTourActive(index, tourStep)`. */
  readonly tourActive: boolean;
  /** `isTutorialLookPending(index, portraitInspected)`. */
  readonly lookPending: boolean;
  /** tourActive || lookPending: no drag, Shop / Unspy opens ignored, hand taps withheld, every send vetoed (§6.6.3). */
  readonly locksTable: boolean;
  readonly tourHighlight: TutorialTourHighlight | null;
  /** `tutorialHighlightAt(index)`, or null while locked or inactive. */
  readonly scriptHighlight: TutorialHighlight;
  /** Null when inactive, which includes the finished board. */
  readonly coach: ArenaCoachView | null;
  /**
   * The tutorial half of `allow` (A.8.4). Always true when inactive; false while locked; true for a
   * sub-choice answer; otherwise the step's legal kind decides, and a veto shows the follow-coach copy.
   */
  readonly allows: (intent: ArenaIntent) => boolean;
  /** tourStep + 1, sends nothing. */
  readonly onAck: () => void;
  /** dismissedKey = messageKey. */
  readonly onHideCoach: () => void;
  /** dismissedKey = null. */
  readonly onShowCoach: () => void;
  /** The shell calls it before opening a seat sheet; it clears the Look gate for a seat whose kit is visible (`!kitHidden`). Latched per mount. */
  readonly onSeatOpened: (playerId: string) => void;
}

export function useArenaTutorial({ view, readOnly, isMyTurn, selfEliminated }: ArenaTutorialInput): ArenaTutorial {
  const [tourStep, setTourStep] = useState(0);
  const [portraitInspected, setPortraitInspected] = useState(false);
  const [idleIndex, setIdleIndex] = useState<number | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  // The index the last send was vetoed at (L75-05): the follow-coach copy shows while it is the live index.
  const [illegalIndex, setIllegalIndex] = useState<number | null>(null);

  const index = view.playKind === 'tutorial' && !readOnly ? view.tutorialIndex : null;
  const active = index !== null;
  const tourActive = isTutorialTourActive(index, tourStep);
  const lookPending = isTutorialLookPending(index, portraitInspected);
  const locksTable = tourActive || lookPending;
  const tourHighlight = tourActive ? (tutorialTourStepAt(tourStep)?.highlight ?? null) : null;
  const scriptHighlight = index !== null && !locksTable ? tutorialHighlightAt(index) : null;

  let coach: ArenaCoachView | null = null;
  const presentation = index === null ? undefined : resolveTutorialPresentationCoach(index, tourStep, portraitInspected);
  if (index !== null && presentation !== undefined) {
    const idle = !locksTable && idleIndex === index;
    const illegal = !locksTable && illegalIndex === index;
    const followCoach = illegal ? resolveIllegalActionCopy('tutorial-follow-coach', '') : null;
    const title = locksTable
      ? presentation.copy.title
      : (followCoach?.title ?? tutorialCoachTitle(presentation.copy, idle));
    const body = followCoach?.body ?? presentation.copy.body;
    const phase = tourActive ? `tour:${String(tourStep)}` : lookPending ? 'look' : 'script';
    const messageKey = `${phase}|${tutorialCoachMessageKey(index, title, body)}`;
    coach = {
      index,
      title,
      body,
      messageKey,
      open: isTutorialCoachOpen(messageKey, dismissedKey),
      showAck: presentation.showAck,
      tour: tourActive,
    };
  }

  // The idle 'Play' title (V2 `table.tsx:539-566`): only on the POV's turn, alive, outside the locks.
  // A new index, tour step or Look state restarts the count.
  useEffect(() => {
    if (index === null || !isMyTurn || selfEliminated || locksTable) return;
    const timer = window.setTimeout(() => {
      setIdleIndex(index);
    }, TUTORIAL_IDLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [index, isMyTurn, selfEliminated, locksTable, tourStep, portraitInspected]);

  return {
    active,
    index,
    tourStep,
    tourActive,
    lookPending,
    locksTable,
    tourHighlight,
    scriptHighlight,
    coach,
    allows: (intent) => {
      if (index === null) return true;
      // The tour and Look gate hold every send silently (V2), with no follow-coach copy.
      if (locksTable) return false;
      // A sub-choice answer passes outside the locks (open-question ruling 8, K5): the server gates only turn actions.
      if (intent.kind === 'resolveSubChoice') return true;
      if (!tutorialSendAllowed(index, tutorialIntentOf(intent, view))) {
        setIllegalIndex(index);
        return false;
      }
      setIllegalIndex(null);
      return true;
    },
    onAck: () => {
      if (coach?.showAck === true) setTourStep((step) => step + 1);
    },
    onHideCoach: () => {
      if (coach !== null) setDismissedKey(coach.messageKey);
    },
    onShowCoach: () => {
      setDismissedKey(null);
    },
    onSeatOpened: (playerId) => {
      if (seatList(view).seats.find((seat) => seat.playerId === playerId)?.kitHidden === false) {
        setPortraitInspected(true);
      }
    },
  };
}
