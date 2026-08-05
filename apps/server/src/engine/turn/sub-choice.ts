/**
 * Single sub-choice gate and timing constant — technical spec v4 §4.4 / §10.2 (L20-18).
 *
 * Before this task the gate was split and asymmetric: `performTurnAction` rejected
 * on pending rewards only, `game-room.handleAction` blocked on Mirror only, and
 * `listLegalActions` checked neither. `hasActiveSubChoice` is now the one predicate
 * both `performTurnAction` and `listLegalActions` consult (§10.2's guard test).
 *
 * `SUB_CHOICE_MS` is the one deadline backing every sub-choice. Default raised
 * 20s → 40s with the turn timer 30s → 60s (designer 2026-08-05). `mirror-choice.ts`
 * and `elimination-rewards.ts` re-export it under their historical names
 * (`MIRROR_SUB_CHOICE_MS`, `REWARD_SUB_CHOICE_MS`) so existing call sites and tests
 * keep working unchanged — see `docs/agent/decisions.md` 2026-08-04 (L20-18).
 */
import type { GameState, SubChoiceKind } from '@card-battle/shared';

export const SUB_CHOICE_MS = 40_000;

/**
 * True while a sub-choice — Mirror, steal-pick, pool/special pick or elimination
 * reward — blocks every other action.
 */
export function hasActiveSubChoice(state: GameState): boolean {
  return (
    state.mirrorChoice !== null ||
    state.stealChoice !== null ||
    state.subChoice !== null ||
    state.rewardChoice !== null ||
    state.rewardQueue.length > 0
  );
}

/** Which sub-choice is currently blocking the table, or `null`. */
export function activeSubChoiceKind(state: GameState): SubChoiceKind | null {
  if (state.mirrorChoice !== null) {
    return 'mirror';
  }

  if (state.stealChoice !== null) {
    return 'steal-pick';
  }

  if (state.subChoice !== null) {
    return state.subChoice.kind;
  }

  if (state.rewardChoice !== null || state.rewardQueue.length > 0) {
    return 'elimination-reward';
  }

  return null;
}
