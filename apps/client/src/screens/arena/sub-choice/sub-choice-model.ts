/**
 * The sub-choice host's pure model — technical spec v7 §6.7; V2 `sub-choice-host.tsx` (L30-03) and
 * `mirror-panel.tsx` (L44-03); Appendix A `table-subchoice-host`, `table-sub-choice-timer-scale`,
 * `table-subchoice-mirror`; Lot 74 plan A.9.4 (L74-18).
 *
 * - The titles and 'On expiry: …' hints are V2's, verbatim and in V2 order. The reward hint ends on
 *   'On expiry:' because the host draws the server's 2× 4-life default after it (`CostAmount`).
 * - The countdown is display only: the server deadline decides (L12-07), so "Time's up" at 0 s
 *   leaves every control live (Q58).
 * - `subChoicePromptKey` tells a resend of the same prompt (the picker keeps its selection) from a
 *   different prompt. The host prefixes its opening count, so a prompt that arrives after
 *   `subChoice` cleared is never mistaken for a resend.
 * - The picker contract (`SubChoiceFrame`, `SubChoiceSend`, `SubChoicePickerProps`) lets every
 *   picker own its selection and its footer inside the host's one blocking Sheet.
 */

import type {
  MirrorChoiceRequiredPayload,
  PendingEffectView,
  PlayingStateView,
  ResolveSubChoicePayload,
  SubChoiceRequiredPayload,
} from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';

import { CLIENT_SUB_CHOICE_MS } from '../../../view-model/sub-choice-constants';
import { nicknameOf } from '../../../view-model/table-helpers';

export type SubChoiceKind = SubChoiceRequiredPayload['kind'];

export interface SubChoiceCopy {
  readonly title: string;
  readonly expiryHint: string;
}

/** V2 `sub-choice-host.tsx`, verbatim, in V2 order. The reward hint's '2× 4 lives' is drawn by the host. */
export const SUB_CHOICE_COPY: Readonly<Record<SubChoiceKind, SubChoiceCopy>> = {
  mirror: { title: 'Mirror redirect', expiryHint: 'On expiry: a random eligible redirect' },
  'elimination-reward': { title: 'Elimination reward', expiryHint: 'On expiry:' },
  'steal-pick': { title: 'Steal a card', expiryHint: 'On expiry: a random eligible card' },
  'pool-pick': { title: 'Recover from pool', expiryHint: 'On expiry: random eligible cards' },
  'special-pick': { title: 'Choose a special', expiryHint: 'On expiry: a random special' },
  'reanimation-kit': { title: 'Choose a kit', expiryHint: 'On expiry: a random kit' },
  'slot-drop': { title: 'Drop an active card', expiryHint: 'On expiry: oldest droppable active card is dropped' },
};

/** V2 `timers.tsx`. */
export const SUB_CHOICE_TIMER_LABEL = 'Sub-choice timer';
/** Spec v7 §6.7, §10.6 (new string). */
export const TIMES_UP_LABEL = "Time's up";

/** The copy hint; slot-drop names you or the slot owner (V2 `slotDropExpiryHint`). */
export function subChoiceExpiryHint(subChoice: SubChoiceRequiredPayload, view: PlayingStateView): string {
  if (subChoice.kind !== 'slot-drop') {
    return SUB_CHOICE_COPY[subChoice.kind].expiryHint;
  }
  if (subChoice.slotOwnerPlayerId === view.you) {
    return 'On expiry: your oldest droppable active card is dropped';
  }
  return `On expiry: ${nicknameOf(view, subChoice.slotOwnerPlayerId)}'s oldest droppable active card is dropped`;
}

/**
 * Same key = a resend of the same prompt (the picker keeps its selection); a new key = a different prompt.
 * The host prefixes its opening count, so a prompt that arrives after `subChoice` cleared is never a resend.
 */
export function subChoicePromptKey(subChoice: SubChoiceRequiredPayload): string {
  switch (subChoice.kind) {
    case 'elimination-reward':
      return `elimination-reward:${subChoice.eliminationId}`;
    case 'steal-pick':
      return `steal-pick:${subChoice.victimPlayerId}`;
    case 'slot-drop':
      return `slot-drop:${subChoice.slotOwnerPlayerId}`;
    case 'mirror':
    case 'pool-pick':
    case 'special-pick':
    case 'reanimation-kit':
      return subChoice.kind;
    default: {
      const _exhaustive: never = subChoice;
      return _exhaustive;
    }
  }
}

export interface SubChoiceCountdown {
  readonly secondsLeft: number;
  readonly percent: number;
}

/** Whole seconds left (ceil, ≥ 0) and the share of `CLIENT_SUB_CHOICE_MS` left (0–100, rounded). */
export function subChoiceCountdown(deadlineMs: number, nowMs: number): SubChoiceCountdown {
  const left = deadlineMs - nowMs;
  return {
    secondsLeft: Math.max(0, Math.ceil(left / 1000)),
    percent: Math.round(Math.min(1, Math.max(0, left / CLIENT_SUB_CHOICE_MS)) * 100),
  };
}

/** `${n}s left` (V2), else TIMES_UP_LABEL at 0. */
export function countdownLabel(countdown: SubChoiceCountdown): string {
  return countdown.secondsLeft > 0 ? `${String(countdown.secondsLeft)}s left` : TIMES_UP_LABEL;
}

/** `picked` while still offered, else the first offered, else null (V2 stale-choice fallback). */
export function resolvePick<T extends string>(picked: T | null, offered: readonly T[]): T | null {
  if (picked !== null && offered.includes(picked)) return picked;
  return offered[0] ?? null;
}

export interface MirrorOptions {
  readonly effects: readonly PendingEffectView[];
  readonly targetIds: readonly string[];
}

/**
 * Eligible pending effects in wire order; living opponents in seat order, Invisible included
 * (V2 `mirror-panel.tsx`; Appendix A `table-subchoice-mirror`: "Invisible seats included; the
 * server accepts them"). An eligible id missing from the view is not offered.
 */
export function mirrorOptions(view: PlayingStateView, subChoice: MirrorChoiceRequiredPayload): MirrorOptions {
  return {
    effects: view.pendingEffects.filter((effect) => subChoice.eligibleEffectIds.includes(effect.id)),
    targetIds: view.players.filter((player) => !player.isYou && !player.isEliminated).map((player) => player.id),
  };
}

export interface SubChoiceFrameParts {
  /** The kind's prompt and tiles, under the expiry line. */
  readonly body: ReactNode;
  /** The Sheet footer (Confirm, or slot-drop's Cancel and Drop); null renders none. */
  readonly actions: ReactElement | null;
}

/** The host's one blocking Sheet around a picker's parts: every picker returns `frame(parts)`. */
export type SubChoiceFrame = (parts: SubChoiceFrameParts) => ReactElement;

/** Commits `resolveSubChoice` once per prompt payload (useCommitOnce). */
export type SubChoiceSend = (payload: ResolveSubChoicePayload) => void;

export interface SubChoicePickerProps<P extends SubChoiceRequiredPayload> {
  readonly subChoice: P;
  readonly view: PlayingStateView;
  readonly frame: SubChoiceFrame;
  readonly send: SubChoiceSend;
  /**
   * The host's `locked` (Lot 74 plan A.9.4). Every commit button (Confirm, or slot-drop's Drop and
   * Cancel) renders disabled with 'Actions locked'; selection stays live.
   */
  readonly locked: boolean;
}
