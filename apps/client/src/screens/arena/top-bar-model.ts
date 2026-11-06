/**
 * Top bar copy and derivations — technical spec v7 §6.1 item 1 (round, turn banner, Block line,
 * flag, menu) and §6.12 ("Leave / forfeit: confirm sheet"); Lot 74 plan Appendix A.8 rulings 2
 * (the round is the log's and the chat's count) and 3 (the flag follows `tableFlagIntent` with
 * `isSpectator`; the V2 leave-action helper has no `isSpectator` input, so it is not used).
 *
 * Pure: no React, no clock. Every string is V2 copy but `MENU_LABEL`. The Block and code-line
 * words live inline in `screens/table.tsx` and `screens/table/timers.tsx`, which the arena import
 * rule bars, so they are repeated here verbatim (reuse, not new copy).
 */

import { chatRoundLabel, tableRound, type PlayingStateView } from '@card-battle/shared';

import { CHAT_LOG_LABEL } from '../../ui/chat/chat-line';
import {
  FORFEIT_ACTION_LABEL,
  FORFEIT_ARIA_LABEL,
  FORFEIT_CONFIRM_BODY,
  FORFEIT_CONFIRM_TITLE,
  LEAVE_TABLE_ACTION_LABEL,
  LEAVE_TABLE_ARIA_LABEL,
  LEAVE_TABLE_CONFIRM_TITLE,
  RETURN_HOME_ACTION_LABEL,
  RETURN_HOME_ARIA_LABEL,
  RETURN_HOME_CONFIRM_BODY,
  RETURN_HOME_CONFIRM_TITLE,
  SKIP_TUTORIAL_ACTION_LABEL,
  SKIP_TUTORIAL_ARIA_LABEL,
  SKIP_TUTORIAL_CONFIRM_BODY,
  SKIP_TUTORIAL_CONFIRM_TITLE,
} from '../../view-model/table-copy';
import { TABLE_BANNER_COPY } from '../../view-model/table-banner';
import { tableFlagAriaLabel, tableFlagIntent, type TableFlagIntent } from '../../view-model/table-flag-intent';

/** New string (plan Appendix B, §10.6): the menu control's name and its sheet title. */
export const MENU_LABEL = 'Menu';
/** V2 Timers fallback when no seat is active. */
export const NO_TURN_OWNER_LABEL = '—';
/** V2 lobby copy. */
export const COPY_CODE_LABEL = 'Copy';
export const CODE_COPIED_LABEL = 'Code copied';
export const CODE_COPY_FAILED_LABEL = 'Copy failed';

/** `Round N`, the same count as the action log and the chat (plan ruling 2). */
export function topBarRoundLabel(view: PlayingStateView): string {
  return chatRoundLabel(tableRound(view.turnSequence, view.players.length));
}

export type TurnBanner =
  | { readonly kind: 'you' }
  | { readonly kind: 'seat'; readonly playerId: string; readonly nickname: string }
  | { readonly kind: 'none' };

/**
 * The finished board (`readOnly`) names nobody: its view keeps the last `currentTurnPlayerId`, so the
 * loser would read "Your turn" over a game that is over (designer 2026-11-06, Gate C stop item S-C3).
 */
export function turnBannerOf(view: PlayingStateView, readOnly: boolean): TurnBanner {
  const activeId = view.currentTurnPlayerId;
  if (readOnly || activeId === null) {
    return { kind: 'none' };
  }
  if (activeId === view.you) {
    return { kind: 'you' };
  }
  const active = view.players.find((player) => player.id === activeId);
  return active === undefined ? { kind: 'none' } : { kind: 'seat', playerId: active.id, nickname: active.nickname };
}

/** 'Your turn' (TABLE_BANNER_COPY.turn) | "{nick}'s turn" | '—'. */
export function turnBannerText(banner: TurnBanner): string {
  switch (banner.kind) {
    case 'you':
      return TABLE_BANNER_COPY.turn;
    case 'seat':
      return `${banner.nickname}'s turn`;
    case 'none':
      return NO_TURN_OWNER_LABEL;
  }
}

/** V2: `Chat` or `Chat, {n} unread` (the `IconButton` badge is aria-hidden, so the name carries the count; L74-16). */
export function chatAriaLabel(unread: number): string {
  return unread > 0 ? `${CHAT_LOG_LABEL}, ${String(unread)} unread` : CHAT_LOG_LABEL;
}

/** The active seat's V2 Block line (`screens/table.tsx` `blockStatusLabel`), or null. */
export function activeBlockLabel(view: PlayingStateView): string | null {
  const active = view.players.find((player) => player.id === view.currentTurnPlayerId);
  if (active === undefined) {
    return null;
  }
  if (active.blockTurnsRemaining > 0) {
    return `Block chain · ${String(active.blockTurnsRemaining)} turn${active.blockTurnsRemaining === 1 ? '' : 's'} left`;
  }
  return active.blockAttacksForbidden ? 'Block · attacks banned this turn' : null;
}

/** V2 Timers meta line. */
export function gameCodeLine(view: PlayingStateView, statusLabel: string): string {
  return `Code ${view.gameCode} · ${statusLabel}`;
}

export type LeaveConfirmIntent = Exclude<TableFlagIntent, 'hidden'>;

export interface LeaveConfirmChrome {
  readonly title: string;
  readonly body: string | null;
  readonly confirm: string;
}

export const LEAVE_CONFIRM_CHROME: Readonly<Record<LeaveConfirmIntent, LeaveConfirmChrome>> = {
  forfeit: { title: FORFEIT_CONFIRM_TITLE, body: FORFEIT_CONFIRM_BODY, confirm: FORFEIT_ACTION_LABEL },
  leaveTable: { title: LEAVE_TABLE_CONFIRM_TITLE, body: null, confirm: LEAVE_TABLE_ACTION_LABEL },
  returnHome: { title: RETURN_HOME_CONFIRM_TITLE, body: RETURN_HOME_CONFIRM_BODY, confirm: RETURN_HOME_ACTION_LABEL },
  skipTutorial: { title: SKIP_TUTORIAL_CONFIRM_TITLE, body: SKIP_TUTORIAL_CONFIRM_BODY, confirm: SKIP_TUTORIAL_ACTION_LABEL },
};

export interface ArenaFlag {
  readonly intent: LeaveConfirmIntent;
  readonly ariaLabel: string;
}

/**
 * The flag for the live view: `tableFlagIntent` with `isSpectator` (ruling 3), re-derived on
 * every render so an elimination while the confirm is open turns Forfeit into Leave table.
 * Null only for `'hidden'`.
 */
export function arenaFlag(view: PlayingStateView, readOnly: boolean): ArenaFlag | null {
  const selfEliminated = view.players.some((player) => player.isYou && player.isEliminated);
  const intent = tableFlagIntent({
    readOnly,
    selfEliminated,
    playKind: view.playKind,
    ...(view.isSpectator === true ? { isSpectator: true } : {}),
  });
  if (intent === 'hidden') {
    return null;
  }
  const ariaLabel = tableFlagAriaLabel(intent, {
    forfeit: FORFEIT_ARIA_LABEL,
    leaveTable: LEAVE_TABLE_ARIA_LABEL,
    returnHome: RETURN_HOME_ARIA_LABEL,
    skipTutorial: SKIP_TUTORIAL_ARIA_LABEL,
  });
  return ariaLabel === null ? null : { intent, ariaLabel };
}
