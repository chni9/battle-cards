/**
 * Apply one search decision on an owned clone — technical spec v5 §6 / L35-02.
 * Mutates `state` in place. Caller must pass `cloneGameState` output only.
 */

import type { GameState } from '@card-battle/shared';

import type { Rng } from '../../engine/rng';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  completePoolPick,
  completeReanimationKitPick,
  completeSpecialPick,
  completeStealChoice,
  performTurnAction,
} from '../../engine/turn/perform-action';
import type { SearchDecision } from './search-types';

export interface ApplySearchDecisionResult {
  readonly ok: boolean;
  readonly terminal: boolean;
}

/**
 * Apply a single decision. Does not drain further sub-choices — those are
 * subsequent search nodes (L35-02).
 */
export function applySearchDecision(
  state: GameState,
  decision: SearchDecision,
  rng: Rng,
  nowMs: number,
): ApplySearchDecisionResult {
  switch (decision.kind) {
    case 'action': {
      const owner = state.currentTurnPlayerId;

      if (owner === null) {
        return { ok: false, terminal: false };
      }

      const result = performTurnAction(state, owner, decision.action, rng, nowMs);
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
    case 'mirror': {
      const owner = state.mirrorChoice?.playerId;

      if (owner === undefined) {
        return { ok: false, terminal: false };
      }

      const result = completeMirrorChoice(
        state,
        owner,
        decision.pendingEffectId,
        decision.newTargetPlayerId,
        rng,
        nowMs,
      );
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
    case 'steal-pick': {
      const owner = state.stealChoice?.playerId;

      if (owner === undefined) {
        return { ok: false, terminal: false };
      }

      const result = completeStealChoice(state, owner, decision.instanceId, rng, nowMs);
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
    case 'pool-pick': {
      const owner = state.subChoice?.playerId;

      if (owner === undefined || state.subChoice?.kind !== 'pool-pick') {
        return { ok: false, terminal: false };
      }

      const result = completePoolPick(state, owner, decision.instanceIds, rng, nowMs);
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
    case 'special-pick': {
      const owner = state.subChoice?.playerId;

      if (owner === undefined || state.subChoice?.kind !== 'special-pick') {
        return { ok: false, terminal: false };
      }

      const result = completeSpecialPick(state, owner, decision.cardId, rng, nowMs);
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
    case 'reanimation-kit': {
      const owner = state.subChoice?.playerId;

      if (owner === undefined || state.subChoice?.kind !== 'reanimation-kit') {
        return { ok: false, terminal: false };
      }

      const result = completeReanimationKitPick(state, owner, decision.kitId, rng, nowMs);
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
    case 'elimination-reward': {
      const result = completeEliminationRewardChoice(
        state,
        decision.chooserPlayerId,
        decision.eliminationId,
        decision.choices,
        nowMs,
      );
      return {
        ok: result.ok,
        terminal: result.ok && result.winnerPlayerId !== null,
      };
    }
  }
}
