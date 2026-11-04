/**
 * The solo menu's local rules (technical spec v7 §7.1, Q3/Q31; Lot 70; L67-01; Appendix A `solo-menu-rules`).
 * Pure: the Play again seed is read once, by the caller's initialiser.
 */

import {
  allowedKitIds,
  defaultLobbyRules,
  isTurnTimeSeconds,
  type LobbyKitSelection,
  type LobbyRules,
  type SetLobbyRulesPayload,
} from '@card-battle/shared';

import type { SoloMenuSeed } from '../solo-menu-seed';

export interface SoloRulesState {
  readonly rules: LobbyRules;
  /** Send the clock at launch; false = the server default (Q3/Q31). */
  readonly includeTurnTime: boolean;
  /** The local kit pick; Random only hides it but keeps it. */
  readonly kitSelection: LobbyKitSelection;
}

export function initialSoloRulesState(seed: SoloMenuSeed | undefined): SoloRulesState {
  if (seed === undefined) {
    return { rules: defaultLobbyRules(), includeTurnTime: false, kitSelection: 'random' };
  }
  return {
    rules: seed.lobbyRules,
    includeTurnTime: isTurnTimeSeconds(seed.lobbyRules.turnTimeSeconds),
    kitSelection: seed.kitSelection,
  };
}

export function applySoloRulesChange(
  state: SoloRulesState,
  next: LobbyRules,
  turnTimeChanged: boolean,
): SoloRulesState {
  const pickExcluded =
    state.kitSelection !== 'random' && !allowedKitIds(next).includes(state.kitSelection);
  return {
    rules: next,
    includeTurnTime:
      state.includeTurnTime || (turnTimeChanged && isTurnTimeSeconds(next.turnTimeSeconds)),
    kitSelection: pickExcluded ? 'random' : state.kitSelection,
  };
}

/**
 * One rules editor payload merged into the local rules (L76-09, spec v7 §7.4). Only the slider's
 * payload carries the clock, so only a slider release sets `includeTurnTime` (Q3/Q31); a kit,
 * Random, All or None payload keeps the clock as it was, and an excluded pick falls back to Random.
 */
export function applySoloRulesPayload(state: SoloRulesState, payload: SetLobbyRulesPayload): SoloRulesState {
  return applySoloRulesChange(
    state,
    { ...state.rules, ...payload, turnTimeSeconds: payload.turnTimeSeconds ?? state.rules.turnTimeSeconds },
    payload.turnTimeSeconds !== undefined,
  );
}

/** Random only launches Random but keeps the local pick. */
export function soloLaunchKitSelection(state: SoloRulesState): LobbyKitSelection {
  return state.rules.randomOnly ? 'random' : state.kitSelection;
}
