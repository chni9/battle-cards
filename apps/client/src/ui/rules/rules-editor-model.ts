/**
 * Host rules editor model — technical spec v7 §7.4 (the host edits the Table rules sheet, live
 * apply), §13 Q3/Q31 (the solo clock stays the server default until the slider is released),
 * Q4/Q18 (the slider sends on release). Appendix A `lobby-rules-host-dialog`,
 * `lobby-rules-dialog-kit-guardrails`, `rules-turn-time-default-override`. L76-09.
 *
 * Pure: every payload is the exact `SET_LOBBY_RULES` body the editor sends. Only the slider's
 * payload carries `turnTimeSeconds`: a payload with it overrides the server clock for the life of
 * the room (map-lobby gotcha 15), so Kit, Random, All and None build a two-key object literal and
 * never spread `rules`, whose `turnTimeSeconds` may be a server default above the host range.
 */

import {
  allowedKitIds,
  allowEveryKit,
  excludeEveryKitButFirst,
  isTurnTimeSeconds,
  MAX_TURN_TIME_SECONDS,
  toggleExcludedKit,
  type KitId,
  type LobbyRules,
  type SetLobbyRulesPayload,
} from '@card-battle/shared';
import { SERVER_DEFAULT_LABEL } from '../ui-copy';
import { formatTurnTimeSeconds } from './rules-summary';

/** What a caller hands `RulesStrip` / `RulesSheet` to turn the read-only sheet into the editor. */
export interface RulesEditorBinding {
  readonly onChange: (payload: SetLobbyRulesPayload) => void;
  /** Busy (solo launch, Q8) or reconnecting (L76-14): every editor control is disabled. */
  readonly disabled?: boolean;
  /** Solo: the clock reads SERVER_DEFAULT_LABEL until the slider is released once (Q3/Q31). */
  readonly serverDefaultTime?: boolean;
}

/** The slider's position: the received seconds inside 5–180, else the host maximum (a 300 s server default sits at 180). */
export function sliderSeconds(rules: LobbyRules): number {
  return isTurnTimeSeconds(rules.turnTimeSeconds) ? rules.turnTimeSeconds : MAX_TURN_TIME_SECONDS;
}

/** The slider's release: the only payload with `turnTimeSeconds`, and none outside 5–180. */
export function turnTimePayload(rules: LobbyRules, seconds: number): SetLobbyRulesPayload | null {
  return isTurnTimeSeconds(seconds)
    ? { excludedKitIds: rules.excludedKitIds, randomOnly: rules.randomOnly, turnTimeSeconds: seconds }
    : null;
}

/** One kit toggled, in `KIT_IDS` order; `null` when it would leave no kit allowed (the caller sends nothing). */
export function kitTogglePayload(rules: LobbyRules, kitId: KitId): SetLobbyRulesPayload | null {
  const next = toggleExcludedKit(rules, kitId);
  return next === null ? null : { excludedKitIds: next.excludedKitIds, randomOnly: next.randomOnly };
}

/** All: every Classic kit allowed again. */
export function allKitsPayload(rules: LobbyRules): SetLobbyRulesPayload {
  const next = allowEveryKit(rules);
  return { excludedKitIds: next.excludedKitIds, randomOnly: next.randomOnly };
}

/** None: every kit excluded but `KIT_IDS[0]`, since at least one kit must stay allowed. */
export function noKitsPayload(rules: LobbyRules): SetLobbyRulesPayload {
  const next = excludeEveryKitButFirst(rules);
  return { excludedKitIds: next.excludedKitIds, randomOnly: next.randomOnly };
}

/** Random only on or off; the exclusions stay. */
export function randomOnlyPayload(rules: LobbyRules, randomOnly: boolean): SetLobbyRulesPayload {
  return { excludedKitIds: rules.excludedKitIds, randomOnly };
}

/** The one kit still allowed: its toggle is locked and says why. */
export function isLastAllowedKit(rules: LobbyRules, kitId: KitId): boolean {
  return !rules.excludedKitIds.includes(kitId) && allowedKitIds(rules).length === 1;
}

/** The strip's clock: SERVER_DEFAULT_LABEL while serverDefaultTime, else formatTurnTimeSeconds(rules.turnTimeSeconds) (never clamped). */
export function turnTimeLabel(rules: LobbyRules, serverDefaultTime: boolean): string {
  return serverDefaultTime ? SERVER_DEFAULT_LABEL : formatTurnTimeSeconds(rules.turnTimeSeconds);
}

/** The slider readout: SERVER_DEFAULT_LABEL while serverDefaultTime AND seconds === sliderSeconds(rules), else `${seconds}s`. */
export function sliderReadout(rules: LobbyRules, seconds: number, serverDefaultTime: boolean): string {
  return serverDefaultTime && seconds === sliderSeconds(rules) ? SERVER_DEFAULT_LABEL : formatTurnTimeSeconds(seconds);
}
