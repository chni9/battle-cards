/**
 * Turn actions — draw, play, buy, sell.
 * Technical spec §4.3, §5.2, §5.4 · rules spec §1, §2, §6 · backlog L2-01.
 */

import {
  actionReject,
  getKit,
  isAttackCardId,
  isSharedAttackCardId,
  isPersistentSpecialCardId,
  type ActionReject,
  type ActionResolutionOutcome,
  type CardId,
  type CardInstance,
  type GameState,
  type KitId,
  type Player,
  type RewardChoice,
  type SpecialCardId,
} from '@card-battle/shared';

import { findHandler } from '../../cards/registry';
import { buyCard } from '../economy/buy-card';
import { buySpecialCard } from '../economy/buy-special-card';
import { sellCard } from '../economy/sell-card';
import { upgradeCard } from '../economy/upgrade-card';
import { grantPoints } from '../economy/grant-resources';
import { buyUpgradePoint, sellUpgradePoint } from '../economy/upgrade-points';
import type { Rng } from '../rng';
import { createRng } from '../rng';
import { isAbsorberTargetable } from './absorb-window';
import { advanceTurn, findPlayer } from './advance-turn';
import { applyPersistentEffects } from './apply-persistent-effects';
import { attacksForbiddenDuringBlock } from './grant-block-turns';
import { deactivatePersistentAction } from '../specials/list-legal-deactivate';
import { activateDuplicationAction } from '../kits/activate-duplication';
import {
  applyDefaultMirrorRedirect,
  type MirrorRedirectInfo,
  redirectPendingAttack,
} from './mirror-choice';
import { applyDefaultStealPick, applyStealPick } from './steal-choice';
import {
  applyDefaultPoolPick,
  applyDefaultReanimationKitPick,
  applyDefaultSpecialPick,
  applyPoolPick,
  applyReanimationKitPick,
  applySpecialPick,
} from './generic-sub-choice';
import {
  applyDefaultEliminationRewards,
  applyEliminationRewardChoices,
  findSoleSurvivorId,
  hasPendingEliminationRewards,
  processEliminations,
  resumeAfterRewards,
  type EliminationEvent,
} from './elimination-rewards';
import { canAffordPlayPoints, playPointsCost } from './play-cost';
import {
  resolvePendingEffects,
  type CurseTransfer,
  type ResolvedEffect,
} from './resolve-pending';
import { hasActiveSubChoice } from './sub-choice';

export type TurnAction =
  | { type: 'draw' }
  | {
      type: 'playCard';
      instanceId: string;
      targetPlayerId?: string;
      quantity?: number;
      consumeInstanceId?: string;
    }
  | {
      type: 'playMultipleAttacks';
      attacks: readonly { instanceId: string; targetPlayerId: string }[];
    }
  | { type: 'buyCard'; cardId: CardId }
  | { type: 'sellCard'; instanceId: string }
  | { type: 'upgradeCard'; instanceId: string }
  | { type: 'buyUpgradePoint' }
  | { type: 'sellUpgradePoint' }
  | { type: 'buySpecialCard' }
  | { type: 'deactivatePersistent'; effectId: string }
  | { type: 'activateDuplication' };

export type PublicActionKind =
  | 'draw'
  | 'playCard'
  | 'playMultipleAttacks'
  | 'buyCard'
  | 'sellCard'
  | 'upgradeCard'
  | 'buyUpgradePoint'
  | 'sellUpgradePoint'
  | 'buySpecialCard'
  | 'deactivatePersistent'
  | 'activateDuplication';

export interface ActionPlayedEvent {
  actorPlayerId: string;
  action: PublicActionKind;
  cardId?: CardId;
  isUpgraded?: boolean;
  targetPlayerId?: string;
  attacks?: readonly { cardId: CardId; targetPlayerId: string; isUpgraded: boolean }[];
  turnSequence: number;
}

export interface ActionResolvedEvent {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: ActionResolutionOutcome;
}

export interface TurnResult {
  ok: true;
  actionPlayed: ActionPlayedEvent;
  resolved: ActionResolvedEvent[];
  /** Set when exactly one non-eliminated player remains after this turn. */
  winnerPlayerId: string | null;
  eliminatedPlayerIds: string[];
  /** Eliminator attribution per eliminated player (Lot 6). */
  eliminations: EliminationEvent[];
  /** True when Mirror paid and is waiting for chooseMirrorTarget / default. */
  mirrorChoicePending?: boolean;
  /** True when Card Thief steal-pick is waiting (L21-03). */
  stealChoicePending?: boolean;
  /** True when `GameState.subChoice` (pool-pick / special-pick) is waiting (L24). */
  subChoicePending?: boolean;
  /** True when elimination rewards are waiting for chooseEliminationReward / default. */
  rewardChoicePending?: boolean;
  /**
   * Present when this result completes a Mirror redirect (choice or default).
   * Room logs `mirrorRedirected` instead of a second `actionPlayed` for Mirror.
   */
  mirrorRedirect?: MirrorRedirectInfo & { turnSequence: number };
  /**
   * Super Mirror fan-out — one entry per duplicate (L30-06).
   * Logged in addition to the Super Mirror `actionPlayed`.
   */
  mirrorRedirects?: readonly (MirrorRedirectInfo & { turnSequence: number })[];
  /** Reanimation revives completed this turn phase (L30-06). */
  playerReanimated?: readonly { playerId: string; kitId: KitId }[];
  /** Curse instances passed by successful attacks this resolve (designer 2026-08-07). */
  curseTransfers?: readonly (CurseTransfer & { turnSequence: number })[];
}

export type TurnRejection = ActionReject;

export type PerformActionResult = TurnResult | TurnRejection;

function subChoiceGateReject(state: GameState): ActionReject {
  if (state.mirrorChoice !== null) {
    return actionReject('finish-mirror-choice');
  }

  if (state.stealChoice !== null) {
    return actionReject('finish-steal-choice');
  }

  if (state.subChoice?.kind === 'pool-pick') {
    return actionReject('finish-pool-pick');
  }

  if (state.subChoice?.kind === 'special-pick') {
    return actionReject('finish-special-pick');
  }

  if (state.subChoice?.kind === 'reanimation-kit') {
    return actionReject('finish-reanimation-kit-pick');
  }

  return actionReject('finish-elimination-rewards');
}

/**
 * Perform the active player's single action, then resolve their pending queue, then
 * check elimination and advance. Rejects a second action via the caller's
 * `actionTakenThisTurn` flag — this function assumes it is legal to act.
 */
export function performTurnAction(
  state: GameState,
  actorPlayerId: string,
  action: TurnAction,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  if (state.currentTurnPlayerId !== actorPlayerId) {
    return actionReject('not-your-turn');
  }

  // Single sub-choice gate (technical spec v4 §4.4/§10.2) — Mirror or elimination
  // reward, whichever is active. Unreachable in practice today: the room blocks
  // Mirror earlier and the sub-choice loop always drains before another action is
  // possible, but the enumerator (`listLegalActions`) needs the same predicate, so
  // this function must not be the odd one out.
  if (hasActiveSubChoice(state)) {
    return subChoiceGateReject(state);
  }

  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined || actor.isEliminated) {
    return actionReject('not-active-player');
  }

  let actionPlayed: ActionPlayedEvent;

  if (action.type === 'draw') {
    grantPoints(state, actor, getKit(actor.kitId).startingResources.draw, 'direct');
    actionPlayed = {
      actorPlayerId,
      action: 'draw',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'buyCard') {
    const bought = buyCard(state, actorPlayerId, action.cardId);

    if (!bought.ok) {
      return bought;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'buyCard',
      cardId: bought.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'sellCard') {
    const sold = sellCard(state, actorPlayerId, action.instanceId);

    if (!sold.ok) {
      return sold;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'sellCard',
      cardId: sold.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'upgradeCard') {
    const upgraded = upgradeCard(state, actorPlayerId, action.instanceId);

    if (!upgraded.ok) {
      return upgraded;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'upgradeCard',
      cardId: upgraded.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'buyUpgradePoint') {
    const bought = buyUpgradePoint(state, actorPlayerId);

    if (!bought.ok) {
      return bought;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'buyUpgradePoint',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'sellUpgradePoint') {
    const sold = sellUpgradePoint(state, actorPlayerId);

    if (!sold.ok) {
      return sold;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'sellUpgradePoint',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'buySpecialCard') {
    const bought = buySpecialCard(state, actorPlayerId, rng);

    if (!bought.ok) {
      return bought;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'buySpecialCard',
      cardId: bought.instance.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'deactivatePersistent') {
    const deactivated = deactivatePersistentAction(state, actorPlayerId, action.effectId);

    if (!deactivated.ok) {
      return deactivated;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'deactivatePersistent',
      cardId: deactivated.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'activateDuplication') {
    const activated = activateDuplicationAction(state, actorPlayerId);

    if (!activated.ok) {
      return activated;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'activateDuplication',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'playMultipleAttacks') {
    const multi = playMultipleAttacksAction(state, actorPlayerId, action.attacks, rng, nowMs);

    if (!multi.ok) {
      return multi;
    }

    actionPlayed = multi.actionPlayed;
  } else {
    const playResult = playCardAction(
      state,
      actorPlayerId,
      action.instanceId,
      action.targetPlayerId,
      action.quantity,
      action.consumeInstanceId,
      rng,
      nowMs,
    );

    if (!playResult.ok) {
      return playResult;
    }

    actionPlayed = playResult.actionPlayed;

    // Mirror / steal-pick / pool-pick start a sub-choice: paid, but resolve/advance wait.
    if (state.mirrorChoice !== null) {
      return {
        ok: true,
        actionPlayed,
        resolved: playResult.immediateResolved,
        winnerPlayerId: null,
        eliminatedPlayerIds: [],
        eliminations: [],
        mirrorChoicePending: true,
      };
    }

    if (state.stealChoice !== null) {
      return {
        ok: true,
        actionPlayed,
        resolved: playResult.immediateResolved,
        winnerPlayerId: null,
        eliminatedPlayerIds: [],
        eliminations: [],
        stealChoicePending: true,
      };
    }

    if (state.subChoice !== null) {
      return {
        ok: true,
        actionPlayed,
        resolved: playResult.immediateResolved,
        winnerPlayerId: null,
        eliminatedPlayerIds: [],
        eliminations: [],
        subChoicePending: true,
      };
    }

    return finishTurnPhases(
      state,
      actorPlayerId,
      actionPlayed,
      rng,
      nowMs,
      playResult.immediateResolved,
      playResult.mirrorRedirects,
    );
  }

  // Mirror / steal-pick start a sub-choice: paid, but resolve/advance wait.
  if (state.mirrorChoice !== null) {
    return {
      ok: true,
      actionPlayed,
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      mirrorChoicePending: true,
    };
  }

  if (state.stealChoice !== null) {
    return {
      ok: true,
      actionPlayed,
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      stealChoicePending: true,
    };
  }

  if (state.subChoice !== null) {
    return {
      ok: true,
      actionPlayed,
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      subChoicePending: true,
    };
  }

  return finishTurnPhases(state, actorPlayerId, actionPlayed, rng, nowMs);
}

/**
 * Mirror play cost is deferred until the redirect sub-choice resolves
 * (playtest 2026-08-09). Affordability was already gated at play time;
 * callers charge only after a successful redirect.
 */
function chargeDeferredMirrorPayment(actor: Player): void {
  const playPoints = playPointsCost('mirror');

  if (playPoints <= 0) {
    return;
  }

  const spent = Math.min(playPoints, actor.points);
  actor.points -= spent;
  actor.turnLedger.pointsSpent += spent;
}

/**
 * Complete a Mirror redirect then finish the Mirror user's turn (resolve + advance).
 */
export function completeMirrorChoice(
  state: GameState,
  actorPlayerId: string,
  pendingEffectId: string,
  newTargetPlayerId: string,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.mirrorChoice;

  if (choice?.playerId !== actorPlayerId) {
    return actionReject('no-mirror-choice-pending');
  }

  if (state.currentTurnPlayerId !== actorPlayerId) {
    return actionReject('not-your-turn');
  }

  if (!choice.eligibleEffectIds.includes(pendingEffectId)) {
    return actionReject('pending-attack-unavailable');
  }

  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (!canAffordPlayPoints(actor, 'mirror')) {
    return actionReject('not-enough-points');
  }

  const redirected = redirectPendingAttack(
    state,
    actor,
    pendingEffectId,
    newTargetPlayerId,
    choice.isUpgraded,
  );

  if (!redirected.ok) {
    return redirected;
  }

  chargeDeferredMirrorPayment(actor);

  const turnSequence = state.turnSequence;
  state.mirrorChoice = null;

  const result = finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'mirror',
      turnSequence,
    },
    rng,
    nowMs,
  );

  return {
    ...result,
    mirrorRedirect: { ...redirected.redirect, turnSequence },
  };
}

/**
 * Apply Mirror default redirect on sub-choice expiry, then finish the turn.
 */
export function expireMirrorChoice(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return actionReject('no-mirror-choice-pending');
  }

  const actorPlayerId = choice.playerId;
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  const applied = applyDefaultMirrorRedirect(state, rng);

  if (!applied.ok) {
    return applied;
  }

  chargeDeferredMirrorPayment(actor);

  const turnSequence = state.turnSequence;
  state.mirrorChoice = null;

  const result = finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'mirror',
      turnSequence,
    },
    rng,
    nowMs,
  );

  return {
    ...result,
    mirrorRedirect: { ...applied.redirect, turnSequence },
  };
}

/**
 * Complete a Card Thief steal-pick then finish the thief's turn (or raise the next pick).
 */
export function completeStealChoice(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.stealChoice;

  if (choice?.playerId !== actorPlayerId) {
    return actionReject('no-steal-choice-pending');
  }

  if (state.currentTurnPlayerId !== actorPlayerId) {
    return actionReject('not-your-turn');
  }

  const applied = applyStealPick(state, instanceId, nowMs);

  if (!applied.ok) {
    return applied;
  }

  if (applied.stillPending) {
    return {
      ok: true,
      actionPlayed: {
        actorPlayerId,
        action: 'playCard',
        cardId: 'card-thief',
        turnSequence: state.turnSequence,
      },
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      stealChoicePending: true,
    };
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-thief',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

/**
 * Apply Card Thief steal-pick default on sub-choice expiry, then finish the turn
 * (or raise the next pick).
 */
export function expireStealChoice(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.stealChoice;

  if (choice === null) {
    return actionReject('no-steal-choice-pending');
  }

  const actorPlayerId = choice.playerId;
  const applied = applyDefaultStealPick(state, rng, nowMs);

  if (!applied.ok) {
    return applied;
  }

  if (applied.stillPending) {
    return {
      ok: true,
      actionPlayed: {
        actorPlayerId,
        action: 'playCard',
        cardId: 'card-thief',
        turnSequence: state.turnSequence,
      },
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      stealChoicePending: true,
    };
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-thief',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

/**
 * Complete a pool-pick (Card Absorber upgraded) then finish the turn.
 */
export function completePoolPick(
  state: GameState,
  actorPlayerId: string,
  instanceIds: readonly string[],
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.subChoice;

  if (choice?.kind !== 'pool-pick' || choice.playerId !== actorPlayerId) {
    return actionReject('no-pool-pick-pending');
  }

  if (state.currentTurnPlayerId !== actorPlayerId) {
    return actionReject('not-your-turn');
  }

  const applied = applyPoolPick(state, instanceIds);

  if (!applied.ok) {
    return applied;
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-absorber',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

/**
 * Apply pool-pick default on sub-choice expiry, then finish the turn.
 */
export function expirePoolPick(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.subChoice;

  if (choice?.kind !== 'pool-pick') {
    return actionReject('no-pool-pick-pending');
  }

  const actorPlayerId = choice.playerId;
  const applied = applyDefaultPoolPick(state, rng);

  if (!applied.ok) {
    return applied;
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-absorber',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

/**
 * Complete a special-pick (Card Transformer upgraded) then finish the turn.
 */
export function completeSpecialPick(
  state: GameState,
  actorPlayerId: string,
  cardId: SpecialCardId,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.subChoice;

  if (choice?.kind !== 'special-pick' || choice.playerId !== actorPlayerId) {
    return actionReject('no-special-pick-pending');
  }

  if (state.currentTurnPlayerId !== actorPlayerId) {
    return actionReject('not-your-turn');
  }

  const applied = applySpecialPick(state, cardId);

  if (!applied.ok) {
    return applied;
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-transformer',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

/**
 * Apply special-pick default on sub-choice expiry, then finish the turn.
 */
export function expireSpecialPick(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.subChoice;

  if (choice?.kind !== 'special-pick') {
    return actionReject('no-special-pick-pending');
  }

  const actorPlayerId = choice.playerId;
  const applied = applyDefaultSpecialPick(state, rng);

  if (!applied.ok) {
    return applied;
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-transformer',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

export type EliminationRewardTurnResult =
  | {
      ok: true;
      rewardChoicePending: boolean;
      subChoicePending?: boolean;
      winnerPlayerId: string | null;
      rewardsClaimed: {
        eliminatorPlayerId: string;
        eliminatedPlayerId: string;
      };
    }
  | ActionReject;

/**
 * Apply the eliminator's reward picks, then continue the queue or resume the turn.
 */
export function completeEliminationRewardChoice(
  state: GameState,
  chooserPlayerId: string,
  eliminationId: string,
  choices: readonly [RewardChoice, RewardChoice],
  nowMs: number = Date.now(),
): EliminationRewardTurnResult {
  return applyEliminationRewardChoices(state, chooserPlayerId, eliminationId, choices, nowMs);
}

/**
 * Grant 2×4 lives on reward sub-choice expiry (technical spec §5.6).
 */
export function expireEliminationRewardChoice(
  state: GameState,
  nowMs: number = Date.now(),
): EliminationRewardTurnResult {
  return applyDefaultEliminationRewards(state, nowMs);
}

export type ReanimationKitTurnResult =
  | {
      ok: true;
      rewardChoicePending: boolean;
      subChoicePending?: boolean;
      winnerPlayerId: string | null;
      playerReanimated?: readonly { playerId: string; kitId: KitId }[];
    }
  | ActionReject;

/**
 * Complete upgraded Reanimation kit pick (#V4-13 / L26-02), then resume.
 */
export function completeReanimationKitPick(
  state: GameState,
  chooserPlayerId: string,
  kitId: KitId,
  rng: Rng = createRng(`${state.seed}:reanim-kit:${state.turnSequence}`),
  nowMs: number = Date.now(),
): ReanimationKitTurnResult {
  const choice = state.subChoice;

  if (choice?.kind !== 'reanimation-kit' || choice.playerId !== chooserPlayerId) {
    return actionReject('no-reanimation-kit-pick-pending');
  }

  const applied = applyReanimationKitPick(state, kitId, rng);

  if (!applied.ok) {
    return applied;
  }

  const resumed = resumeAfterRewards(state, rng, nowMs);
  const playerReanimated = [
    applied.playerReanimated,
    ...(resumed.playerReanimated ?? []),
  ];

  return {
    ...resumed,
    ...(playerReanimated.length > 0 ? { playerReanimated } : {}),
  };
}

/**
 * Default upgraded Reanimation kit on expiry — seeded random (#V4-13).
 */
export function expireReanimationKitPick(
  state: GameState,
  rng: Rng = createRng(`${state.seed}:reanim-kit-default:${state.turnSequence}`),
  nowMs: number = Date.now(),
): ReanimationKitTurnResult {
  const choice = state.subChoice;

  if (choice?.kind !== 'reanimation-kit') {
    return actionReject('no-reanimation-kit-pick-pending');
  }

  const applied = applyDefaultReanimationKitPick(state, rng);

  if (!applied.ok) {
    return applied;
  }

  const resumed = resumeAfterRewards(state, rng, nowMs);
  const playerReanimated = [
    applied.playerReanimated,
    ...(resumed.playerReanimated ?? []),
  ];

  return {
    ...resumed,
    ...(playerReanimated.length > 0 ? { playerReanimated } : {}),
  };
}

function finishTurnPhases(
  state: GameState,
  actorPlayerId: string,
  actionPlayed: ActionPlayedEvent,
  rng: Rng,
  nowMs: number,
  immediateResolved: readonly ActionResolvedEvent[] = [],
  mirrorRedirects?: readonly (MirrorRedirectInfo & { turnSequence: number })[],
): TurnResult {
  const resolvedEffects = resolvePendingEffects(state, actorPlayerId, rng);
  applyPersistentEffects(state, actorPlayerId);
  const { eliminations, playerReanimated } = processEliminations(state, rng, nowMs);
  const eliminatedPlayerIds = eliminations.map((entry) => entry.playerId);
  const resolved = [...immediateResolved, ...toResolvedEvents(resolvedEffects)];
  const curseTransfers = collectCurseTransfers(
    resolvedEffects,
    actionPlayed.turnSequence,
  );

  const reanimated =
    playerReanimated.length > 0 ? { playerReanimated } : {};
  const redirects =
    mirrorRedirects !== undefined && mirrorRedirects.length > 0 ? { mirrorRedirects } : {};
  const transfers =
    curseTransfers.length > 0 ? { curseTransfers } : {};

  if (hasPendingEliminationRewards(state)) {
    return {
      ok: true,
      actionPlayed,
      resolved,
      winnerPlayerId: null,
      eliminatedPlayerIds,
      eliminations,
      rewardChoicePending: true,
      ...reanimated,
      ...redirects,
      ...transfers,
    };
  }

  if (state.subChoice?.kind === 'reanimation-kit') {
    return {
      ok: true,
      actionPlayed,
      resolved,
      winnerPlayerId: null,
      eliminatedPlayerIds,
      eliminations,
      subChoicePending: true,
      ...reanimated,
      ...redirects,
      ...transfers,
    };
  }

  const winnerPlayerId = findSoleSurvivorId(state);

  if (winnerPlayerId === null) {
    advanceTurn(state);
  } else {
    state.currentTurnPlayerId = null;
  }

  return {
    ok: true,
    actionPlayed,
    resolved,
    winnerPlayerId,
    eliminatedPlayerIds,
    eliminations,
    ...reanimated,
    ...redirects,
    ...transfers,
  };
}

function collectCurseTransfers(
  resolved: readonly ResolvedEffect[],
  turnSequence: number,
): (CurseTransfer & { turnSequence: number })[] {
  const transfers: (CurseTransfer & { turnSequence: number })[] = [];

  for (const entry of resolved) {
    if (entry.curseTransfers === undefined) {
      continue;
    }

    for (const transfer of entry.curseTransfers) {
      transfers.push({ ...transfer, turnSequence });
    }
  }

  return transfers;
}

/**
 * Assassin multi-attack — rules spec §4, backlog L4-05.
 * All-or-nothing: validate fully before paying or queuing.
 */
function playMultipleAttacksAction(
  state: GameState,
  actorPlayerId: string,
  attacks: readonly { instanceId: string; targetPlayerId: string }[],
  rng: Rng,
  nowMs: number,
): TurnRejection | { ok: true; actionPlayed: ActionPlayedEvent } {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (attacksForbiddenDuringBlock(actor)) {
    return actionReject('attacks-forbidden-during-block');
  }

  if (!getKit(actor.kitId).traits.allowsMultipleAttacksPerTurn) {
    return actionReject('multi-attack-kit-forbidden');
  }

  if (attacks.length < 2) {
    return actionReject('multi-attack-need-two');
  }

  const seenIds = new Set<string>();

  for (const attack of attacks) {
    if (seenIds.has(attack.instanceId)) {
      return actionReject('duplicate-attack-selection');
    }

    seenIds.add(attack.instanceId);
  }

  interface PreparedAttack {
    instance: CardInstance;
    targetPlayerId: string;
    playPoints: number;
  }

  const prepared: PreparedAttack[] = [];
  let totalCost = 0;

  for (const attack of attacks) {
    const instance = actor.hand.find((card) => card.instanceId === attack.instanceId);

    if (instance === undefined) {
      return actionReject('card-not-held');
    }

    if (!isSharedAttackCardId(instance.cardId)) {
      return actionReject('only-attacks-multiplayable');
    }

    const target = findPlayer(state, attack.targetPlayerId);

    if (target === undefined || target.isEliminated || target.id === actorPlayerId) {
      return actionReject('invalid-target');
    }

    const handler = findHandler(instance.cardId);

    if (handler === undefined) {
      return actionReject('card-not-playable-yet');
    }

    const context = {
      state,
      sourcePlayerId: actorPlayerId,
      targetPlayerId: attack.targetPlayerId,
      card: instance,
      quantity: null,
      consumeInstanceId: null,
      rng,
      nowMs,
      immediateResolved: [],
    };

    if (!handler.canPlay(context)) {
      return actionReject('play-not-legal');
    }

    const playPoints = playPointsCost(instance.cardId);
    totalCost += playPoints;
    prepared.push({
      instance,
      targetPlayerId: attack.targetPlayerId,
      playPoints,
    });
  }

  if (actor.points < totalCost) {
    return actionReject('not-enough-points');
  }

  const publicAttacks: { cardId: CardId; targetPlayerId: string; isUpgraded: boolean }[] = [];

  for (const entry of prepared) {
    if (entry.playPoints > 0) {
      actor.points -= entry.playPoints;
      actor.turnLedger.pointsSpent += entry.playPoints;
    }

    const handler = findHandler(entry.instance.cardId);

    if (handler === undefined) {
      return actionReject('card-not-playable-yet');
    }

    handler.play({
      state,
      sourcePlayerId: actorPlayerId,
      targetPlayerId: entry.targetPlayerId,
      card: entry.instance,
      quantity: null,
      consumeInstanceId: null,
      rng,
      nowMs,
      immediateResolved: [],
    });

    publicAttacks.push({
      cardId: entry.instance.cardId,
      targetPlayerId: entry.targetPlayerId,
      isUpgraded: entry.instance.isUpgraded,
    });
  }

  return {
    ok: true,
    actionPlayed: {
      actorPlayerId,
      action: 'playMultipleAttacks',
      attacks: publicAttacks,
      turnSequence: state.turnSequence,
    },
  };
}

function snapshotPendingEffectIds(state: GameState): Set<string> {
  const ids = new Set<string>();

  for (const player of state.players) {
    for (const effect of player.pendingEffects) {
      ids.add(effect.id);
    }
  }

  return ids;
}

function collectSuperMirrorRedirects(
  state: GameState,
  actorPlayerId: string,
  beforeIds: ReadonlySet<string>,
  turnSequence: number,
): readonly (MirrorRedirectInfo & { turnSequence: number })[] {
  const redirects: (MirrorRedirectInfo & { turnSequence: number })[] = [];

  for (const player of state.players) {
    for (const effect of player.pendingEffects) {
      if (effect.redirectedBy === 'super-mirror' && !beforeIds.has(effect.id)) {
        redirects.push({
          actorPlayerId,
          cardId: 'super-mirror',
          previousTargetPlayerId: actorPlayerId,
          newTargetPlayerId: effect.targetPlayerId,
          turnSequence,
        });
      }
    }
  }

  return redirects;
}

function playCardAction(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
  targetPlayerId: string | undefined,
  quantity: number | undefined,
  consumeInstanceId: string | undefined,
  rng: Rng,
  nowMs: number,
): TurnRejection | {
  ok: true;
  actionPlayed: ActionPlayedEvent;
  immediateResolved: ActionResolvedEvent[];
  mirrorRedirects?: readonly (MirrorRedirectInfo & { turnSequence: number })[];
} {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  const handIndex = actor.hand.findIndex((card) => card.instanceId === instanceId);
  const specialIndex = actor.specialCards.findIndex((card) => card.instanceId === instanceId);
  const fromSpecials = handIndex < 0 && specialIndex >= 0;

  if (handIndex < 0 && specialIndex < 0) {
    return actionReject('card-not-held');
  }

  const instance = fromSpecials
    ? actor.specialCards[specialIndex]
    : actor.hand[handIndex];

  if (instance === undefined) {
    return actionReject('card-not-held');
  }

  const cardId = instance.cardId;
  const handler = findHandler(cardId);

  if (handler === undefined) {
    return actionReject('card-not-playable-yet');
  }

  if (attacksForbiddenDuringBlock(actor) && isAttackCardId(cardId)) {
    return actionReject('attacks-forbidden-during-block');
  }

  let resolvedTargetId: string | null = null;

  if (targetPlayerId !== undefined) {
    const target = findPlayer(state, targetPlayerId);
    const absorberCorpseOk =
      cardId === 'absorber' && target !== undefined && isAbsorberTargetable(target);

    if (
      target === undefined ||
      target.id === actorPlayerId ||
      (target.isEliminated && !absorberCorpseOk)
    ) {
      return actionReject('invalid-target');
    }

    resolvedTargetId = targetPlayerId;
  }

  const immediateResolved: ActionResolvedEvent[] = [];
  const context = {
    state,
    sourcePlayerId: actorPlayerId,
    targetPlayerId: resolvedTargetId,
    card: instance,
    quantity: quantity ?? null,
    consumeInstanceId: consumeInstanceId ?? null,
    rng,
    nowMs,
    immediateResolved,
  };

  if (!handler.canPlay(context)) {
    return actionReject('play-not-legal');
  }

  // Play payment: points from catalog (shared or special Price). Life / pointsPerLife
  // play costs land with their handlers (Tax, Regeneration). Shared with listLegalActions
  // (technical spec v3 §4.3 rule 4). Mirror charges on sub-choice complete / expiry
  // (playtest 2026-08-09) so the cost lands with the redirect choice.
  if (!canAffordPlayPoints(actor, cardId)) {
    return actionReject('not-enough-points');
  }

  const deferMirrorPayment = cardId === 'mirror';
  const playPoints = deferMirrorPayment ? 0 : playPointsCost(cardId);

  if (playPoints > 0) {
    actor.points -= playPoints;
    actor.turnLedger.pointsSpent += playPoints;
  }

  const beforeEffectIds = cardId === 'super-mirror' ? snapshotPendingEffectIds(state) : null;

  // Attack and action cards are reusable; specials are single-use (rules spec §5).
  handler.play(context);

  const mirrorRedirects =
    beforeEffectIds !== null
      ? collectSuperMirrorRedirects(
          state,
          actorPlayerId,
          beforeEffectIds,
          state.turnSequence,
        )
      : undefined;

  if (fromSpecials) {
    actor.specialCards = actor.specialCards.filter((card) => card.instanceId !== instanceId);

    // Persistent specials stay active via activePersistentEffects until deactivated.
    if (!isPersistentSpecialCardId(cardId)) {
      state.pool.push(instance);
    }
  }

  return {
    ok: true,
    actionPlayed: {
      actorPlayerId,
      action: 'playCard',
      cardId,
      isUpgraded: instance.isUpgraded,
      ...(resolvedTargetId !== null ? { targetPlayerId: resolvedTargetId } : {}),
      turnSequence: state.turnSequence,
    },
    immediateResolved,
    ...(mirrorRedirects !== undefined && mirrorRedirects.length > 0
      ? { mirrorRedirects }
      : {}),
  };
}

function toResolvedEvents(resolved: ResolvedEffect[]): ActionResolvedEvent[] {
  return resolved.map((entry) => ({
    effectId: entry.effect.id,
    sourcePlayerId: entry.effect.sourcePlayerId,
    targetPlayerId: entry.effect.targetPlayerId,
    cardId: entry.effect.cardId,
    isUpgraded: entry.effect.isUpgraded,
    livesLost: entry.livesLost,
    shieldAbsorbed: entry.shieldAbsorbed,
    outcome: entry.outcome,
  }));
}

/**
 * Elimination at 0 lives is handled by `processEliminations` (Lot 6).
 * Sole-survivor uses `findSoleSurvivorId` (honours `pendingReanimation`, L26).
 */
