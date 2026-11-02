/**
 * The sub-choice host — technical spec v7 §6.7, §13 Q55 / Q58 / Q59, §14.2; Appendix A
 * `table-subchoice-host`, `table-sub-choice-non-dismissible`, `table-sub-choice-timer-scale`;
 * Lot 74 plan A.9.4 (L74-18).
 *
 * - **One blocking Sheet, outside the read-only reducer.** `props.subChoice` opens it; Esc,
 *   backdrop and swipe do nothing (the primitive's `blocking` mode). Minimize is the primitive's
 *   own: it collapses the sheet to a bar above every sheet while `ctx.subChoice` keeps every intent
 *   locked (Q59), so the host passes no `onMinimizedChange`.
 * - **Exit.** The host keeps the last payload, so the sheet plays its exit, and its press shield,
 *   after `subChoice` clears (a double tap on Confirm must not land on the arena).
 * - **Picker key.** Each picker is keyed by the host's opening count plus `subChoicePromptKey`. A
 *   resend of the same prompt keeps the picker and its selection (and a minimized sheet stays
 *   minimized); a prompt that arrives after a clear mounts a fresh picker, reopened expanded. The
 *   host outlives `subChoice`, so a key from the prompt alone would carry the last prompt's pick
 *   into the next one of the same kind (V2 mounted its host only while a prompt existed).
 * - **Timer.** 'On expiry: …' (V2), then 'Ns left', then "Time's up" at 0 s with every control
 *   live: the server deadline decides (L12-07, Q58). The bar drains over `CLIENT_SUB_CHOICE_MS`.
 * - **Answers.** Pickers answer through `send`: one `resolveSubChoice` through the arena commit per
 *   payload, whatever the button (`useCommitOnce` on the payload and `actionReject`), with one
 *   argument (plan A.9.3, D4). `locked` (L74-25 sets it while reconnecting, S4) disables every
 *   commit button with 'Actions locked' and makes `send` a no-op, so the latch never latches a
 *   lost send; selection and Minimize stay usable.
 * - Nothing shows another seat's open prompt (§14.2): `subChoice` is only ever the POV's.
 */

import type { PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { Fragment, useState, type ReactElement } from 'react';

import type { ActionRejectPayload } from '../../../net/use-room-connection';
import { CostAmount } from '../../../ui/card/cost-amount';
import { usePrefersReducedMotion } from '../../../ui/motion/use-prefers-reduced-motion';
import { motionAttribute } from '../../../ui/primitives/chrome-classes';
import { Sheet } from '../../../ui/primitives/sheet';
import type { ArenaCommit } from '../arena-commit';
import { useCommitOnce } from '../use-commit-once';
import { KitChoice } from './kit-choice';
import { MirrorChoice } from './mirror-choice';
import { PoolChoice } from './pool-choice';
import { RewardChoice } from './reward-choice';
import { SlotDropChoice } from './slot-drop-choice';
import { SpecialChoice } from './special-choice';
import { StealChoice } from './steal-choice';
import {
  countdownLabel,
  SUB_CHOICE_COPY,
  SUB_CHOICE_TIMER_LABEL,
  subChoiceCountdown,
  subChoiceExpiryHint,
  subChoicePromptKey,
  type SubChoiceFrame,
  type SubChoiceSend,
} from './sub-choice-model';

export interface SubChoiceSheetProps {
  /** `props.subChoice`: null closes the sheet (resolve, TURN_STARTED, game over). */
  subChoice: SubChoiceRequiredPayload | null;
  view: PlayingStateView;
  /** `props.nowMs`: the countdown only; the server deadline decides (L12-07). */
  nowMs: number;
  /** The arena commit (A.9.3). */
  commit: ArenaCommit;
  /** `props.actionReject`: a reject re-arms the answer latch. */
  actionReject: ActionRejectPayload | null;
  /**
   * Default false (Lot 74 plan A.9.4): L74-25 passes `locked={reconnecting}`. While locked, Confirm, Drop and
   * slot-drop Cancel render disabled, `send` returns without committing (so the answer latch never
   * latches a lost send), and Minimize stays usable.
   */
  locked?: boolean;
}

/** The latch epoch before any prompt: a stable object, so the hook order never depends on a prompt. */
const NO_PROMPT = {};

/** The server's 2× 4-life default when a reward prompt expires (V2 `CostDisplay`). */
const REWARD_EXPIRY_LIVES = { kind: 'lives', amount: 4 } as const;
const REWARD_EXPIRY_MULTIPLIER = 2;

/** One picker per kind; every picker returns `frame(parts)` and receives `locked`. */
function pickerFor(
  subChoice: SubChoiceRequiredPayload,
  view: PlayingStateView,
  frame: SubChoiceFrame,
  send: SubChoiceSend,
  locked: boolean,
): ReactElement {
  switch (subChoice.kind) {
    case 'mirror':
      return <MirrorChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    case 'elimination-reward':
      return <RewardChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    case 'steal-pick':
      return <StealChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    case 'pool-pick':
      return <PoolChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    case 'special-pick':
      return <SpecialChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    case 'reanimation-kit':
      return <KitChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    case 'slot-drop':
      return <SlotDropChoice subChoice={subChoice} view={view} frame={frame} send={send} locked={locked} />;
    default: {
      const _exhaustive: never = subChoice;
      return _exhaustive;
    }
  }
}

export function SubChoiceSheet({
  subChoice,
  view,
  nowMs,
  commit,
  actionReject,
  locked = false,
}: SubChoiceSheetProps): ReactElement | null {
  // Keep the last payload through the exit; render-phase, never an effect.
  const [shown, setShown] = useState(subChoice);
  if (subChoice !== null && subChoice !== shown) setShown(subChoice);
  // Count the openings (subChoice null → a prompt), render-phase like `shown`: the picker key carries it.
  const [wasOpen, setWasOpen] = useState(subChoice !== null);
  const [openings, setOpenings] = useState(0);
  if ((subChoice !== null) !== wasOpen) {
    setWasOpen(subChoice !== null);
    if (subChoice !== null) setOpenings(openings + 1);
  }
  const once = useCommitOnce({ view: shown ?? NO_PROMPT, reject: actionReject });
  const reduced = usePrefersReducedMotion();
  if (shown === null) return null;

  const send: SubChoiceSend = (payload) => {
    // A lost send must never latch the answer (plan A.9.4).
    if (locked) return;
    // One argument (plan A.9.3, D4).
    once('resolve', () => {
      commit({ kind: 'resolveSubChoice', payload });
      return true;
    });
  };
  const countdown = subChoiceCountdown(shown.deadlineMs, nowMs);
  const frame: SubChoiceFrame = ({ body, actions }) => (
    <Sheet
      open={subChoice !== null}
      mode="blocking"
      placement="bottom"
      title={SUB_CHOICE_COPY[shown.kind].title}
      dataAttributes={{ 'data-arena-sheet': 'sub-choice', 'data-sub-choice': shown.kind }}
      {...(shown.kind === 'elimination-reward' ? { hintAnchor: 'reward' } : {})}
      {...(actions !== null ? { actions } : {})}
    >
      <div data-zone="sub-choice-timer" className="mb-3 flex flex-col gap-1.5">
        <p className="text-v7-caption text-v7-text-2">
          {subChoiceExpiryHint(shown, view)}
          {shown.kind === 'elimination-reward' ? (
            <>
              {' '}
              <CostAmount amount={REWARD_EXPIRY_LIVES} multiplier={REWARD_EXPIRY_MULTIPLIER} />
            </>
          ) : null}
          {' · '}
          <span>{countdownLabel(countdown)}</span>
        </p>
        <div
          role="progressbar"
          aria-label={SUB_CHOICE_TIMER_LABEL}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={countdown.percent}
          className="h-1.5 w-full overflow-hidden rounded-full bg-v7-bg-0"
        >
          <div
            data-motion={motionAttribute(reduced)}
            className={`h-full bg-v7-threat-other ${reduced ? '' : 'transition-[width] duration-(--dur-base)'}`}
            style={{ width: `${String(countdown.percent)}%` }}
          />
        </div>
      </div>
      {body}
    </Sheet>
  );

  return <Fragment key={`${String(openings)}:${subChoicePromptKey(shown)}`}>{pickerFor(shown, view, frame, send, locked)}</Fragment>;
}
