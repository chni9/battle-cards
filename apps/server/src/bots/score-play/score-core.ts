/**
 * Core `playCard` scoring — every V1 card, plus Cloning outside an incoming threat
 * (already branched since L20-17; retuned by L29-06 alongside the persistents move).
 *
 * MEGA ATTACK and Sentence/Imposition/Spy Thief/Points Generator moved out to
 * `score-attacks-redirect.ts` (L29-07) and `score-persistents.ts` (L29-06) — see
 * `families.ts`. Otherwise the verbatim body of the pre-split `scorePlayCard`
 * (technical spec v3 §4.4, §4.6 / L16-04), moved here unchanged by L29-01. Re-checks
 * `findOwnCard` and the point-reserve gate itself so the dispatcher in `./index.ts`
 * can stay a plain family switch.
 */

import {
  attackDamageFor,
  getCard,
  getKit,
  isAttackCardId,
  type BotReasonCode,
  type PlayingStateView,
} from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import { regenSoftLifeForKit, taxLifeBufferForKit } from '../heuristic-life-thresholds';
import {
  BURN_COUNTER_BONUS,
  FINISH_CHIP_BONUS,
  HEURISTIC_BAND_WEIGHTS,
  MUTUAL_CANCEL_BONUS,
  PRESSURE_COST_DIVISOR,
  SPY_TOP_THREAT_BONUS,
  SPY_UNSPIED_BONUS,
  STRIKE_MIN_DAMAGE,
  TAX_INVEST_BONUS,
  UNSCORED_PLAY_PENALTY,
} from '../heuristic-weights';
import {
  bestAffordableStrikeDamage,
  eligibleMirrorPendingFromView,
  estimateSuicideElims,
  estimatedPlayPoints,
  findOwnCard,
  hasAnyIncomingFrom,
  hasCancelingIncomingFrom,
  hasPendingCardFrom,
  isImmuneTarget,
  isSpyThiefImmuneSeat,
  knownOpponentLives,
  maxBurnableCounter,
  scoreAbsorber,
  violatesPointReserve,
  weakestDyingSeat,
  type PolicyContext,
} from '../policy-internals';

export function scoreCorePlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  const { cardId, isUpgraded } = instance;

  const playCostPoints = estimatedPlayPoints(cardId, isUpgraded);

  if (
    playCostPoints > 0 &&
    violatesPointReserve(view, ctx, view.self.points - playCostPoints) &&
    ctx.stance !== 'finish'
  ) {
    // Still allow Survive-band counters below.
    if (
      !(
        (cardId === 'mirror' || cardId === 'shield') &&
        ctx.incomingThreat > 0
      )
    ) {
      return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
    }
  }

  // Never base Suicide; upgraded only if estimated elim ≥ 1. Kamikaze-native or stolen
  // (L29-04) — the branch does not gate on kitId, only on holding the card.
  if (cardId === 'suicide') {
    if (!isUpgraded) {
      return { score: Number.NEGATIVE_INFINITY, code: 'lethal-now' };
    }

    const elims = estimateSuicideElims(view, ctx);

    if (elims < 1) {
      return { score: Number.NEGATIVE_INFINITY, code: 'lethal-now' };
    }

    return { score: HEURISTIC_BAND_WEIGHTS.lethalNow + elims * 10, code: 'lethal-now' };
  }

  if (action.targetPlayerId !== undefined && isImmuneTarget(view, action.targetPlayerId, cardId)) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Mutual cancel (Lot 19): equal or stronger attack back at the source cancels the weaker.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const damage = attackDamageFor(cardId, isUpgraded);

    if (hasCancelingIncomingFrom(view, action.targetPlayerId, damage)) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.survive + MUTUAL_CANCEL_BONUS + damage,
        code: 'survive',
      };
    }
  }

  // Spy/Thief counter — same card back at the source cancels both (tech §4.7).
  if (
    (cardId === 'spy' || cardId === 'thief') &&
    action.targetPlayerId !== undefined &&
    hasPendingCardFrom(view, action.targetPlayerId, cardId)
  ) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.survive + MUTUAL_CANCEL_BONUS,
      code: 'survive',
    };
  }

  // Survive band — any pending attack (lean into counters / life buys under fire).
  if (ctx.incomingThreat > 0) {
    // Mirror eligibility (L29-07 / mirror-choice.ts parity): a base Mirror facing only
    // an upgraded or MEGA-ineligible pending attack has nothing to redirect — falling
    // through to the sustain band below instead of a Survive it cannot actually fire.
    if (cardId === 'mirror' && eligibleMirrorPendingFromView(view, isUpgraded).length > 0) {
      return { score: HEURISTIC_BAND_WEIGHTS.survive + 30, code: 'survive' };
    }

    if (cardId === 'shield') {
      return { score: HEURISTIC_BAND_WEIGHTS.survive + 20, code: 'survive' };
    }

    if (cardId === 'regeneration') {
      return {
        score: HEURISTIC_BAND_WEIGHTS.survive + (action.quantity ?? 0),
        code: 'survive',
      };
    }

    if (cardId === 'cloning') {
      return { score: HEURISTIC_BAND_WEIGHTS.survive + 10, code: 'survive' };
    }
  }

  // Lethal now — Spy-confirmed lives only
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const knownLives = knownOpponentLives(view, action.targetPlayerId);

    if (knownLives !== null) {
      const damage = attackDamageFor(cardId, isUpgraded);

      if (damage >= knownLives) {
        return { score: HEURISTIC_BAND_WEIGHTS.lethalNow + damage, code: 'lethal-now' };
      }
    }
  }

  // Deny — Absorber (base: lives; upgraded: UP / points / lives from last complete turn).
  if (cardId === 'absorber' && action.targetPlayerId !== undefined) {
    return scoreAbsorber(view, action.targetPlayerId, isUpgraded, ctx);
  }

  // Burn public counter persistents (Imposition / Points Generator) — any attack damage
  // that reaches lives decrements counters (engine.md). Chip attacks allowed here.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const need = maxBurnableCounter(view, action.targetPlayerId);

    if (need > 0) {
      const damage = attackDamageFor(cardId, isUpgraded);
      const clears = damage >= need ? 40 : 0;
      return {
        score:
          HEURISTIC_BAND_WEIGHTS.deny +
          BURN_COUNTER_BONUS +
          Math.min(damage, need) * 15 +
          clears,
        code: 'deny',
      };
    }
  }

  // Spy — unlock kit/hand (and upgraded: live tokens) so lethal-now can fire later.
  if (cardId === 'spy' && action.targetPlayerId !== undefined) {
    const target = view.players.find((player) => player.id === action.targetPlayerId);

    if (
      target === undefined ||
      target.isEliminated ||
      target.isYou ||
      isSpyThiefImmuneSeat(view, action.targetPlayerId)
    ) {
      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    const already = target.spied;

    if (already !== undefined) {
      // Base Spy already on them: only upgraded Spy still adds live resources.
      if (isUpgraded && already.lives === undefined) {
        return {
          score: HEURISTIC_BAND_WEIGHTS.deny + 25,
          code: 'deny',
        };
      }

      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    const onTop = action.targetPlayerId === ctx.threatOrder[0] ? SPY_TOP_THREAT_BONUS : 0;
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + SPY_UNSPIED_BONUS + onTop,
      code: 'deny',
    };
  }

  if (cardId === 'thief' && action.targetPlayerId !== undefined) {
    if (isSpyThiefImmuneSeat(view, action.targetPlayerId)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    const spend = ctx.observedSpend.get(action.targetPlayerId) ?? 0;
    const topSpender = ctx.threatOrder.find((id) => (ctx.observedSpend.get(id) ?? 0) > 0);
    // Prefer highest observed spending
    const maxSpend = Math.max(0, ...[...ctx.observedSpend.values()]);

    if (spend === maxSpend && spend > 0) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.deny + spend + (topSpender === action.targetPlayerId ? 1 : 0),
        code: 'deny',
      };
    }

    // No spend signal — do not rng-tie with draw.
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  // Cloning without incoming threat: only when Spy shows a richer seat; else below draw.
  if (cardId === 'cloning' && action.targetPlayerId !== undefined && ctx.incomingThreat <= 0) {
    const target = view.players.find((player) => player.id === action.targetPlayerId);
    const spied = target?.spied;

    if (spied?.lives !== undefined && spied.lives > view.self.lives + 2) {
      return {
        // Retuned 40 → 50 (2026-08-05, L29-06, decisions.md).
        score: HEURISTIC_BAND_WEIGHTS.invest + 50 + (isUpgraded ? 15 : 0),
        code: 'invest',
      };
    }

    if (spied?.points !== undefined && spied.points > view.self.points + 5) {
      return {
        // Retuned 35 → 45 (2026-08-05, L29-06, decisions.md).
        score: HEURISTIC_BAND_WEIGHTS.invest + 45 + (isUpgraded ? 15 : 0),
        code: 'invest',
      };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
      code: 'sustain',
    };
  }

  // Absorber without a target should not reach here; safety below draw.
  if (cardId === 'absorber') {
    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
      code: 'sustain',
    };
  }

  // Pressure — finish stance chips Spy-known dying seats; otherwise upgraded strikes only.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const damage = attackDamageFor(cardId, isUpgraded);
    const playCost = getCard(cardId)?.cost.points ?? 0;

    if (violatesPointReserve(view, ctx, view.self.points - playCost)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'pressure' };
    }

    const knownLives = knownOpponentLives(view, action.targetPlayerId);
    const canFinishKnown =
      knownLives !== null && knownLives > 0 && damage >= knownLives && playCost <= view.self.points;

    if (ctx.stance === 'finish' && canFinishKnown) {
      const onWeakest =
        action.targetPlayerId === weakestDyingSeat(view, bestAffordableStrikeDamage(view))
          ? 15
          : 0;
      return {
        score: HEURISTIC_BAND_WEIGHTS.pressure + FINISH_CHIP_BONUS + damage + onWeakest,
        code: 'pressure',
      };
    }

    if (!isUpgraded || damage < STRIKE_MIN_DAMAGE) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.sustain - 15,
        code: 'pressure',
      };
    }

    const cost = Math.max(1, playCost || 1);
    const topTarget = ctx.threatOrder[0];
    const onTop = action.targetPlayerId === topTarget ? 5 : 0;
    const retaliateBonus = hasAnyIncomingFrom(view, action.targetPlayerId) ? 8 : 0;
    const knownFinishBonus =
      knownLives !== null && knownLives <= damage + 2 ? 20 : knownLives !== null ? 8 : 0;
    const shieldPenalty = view.players.find((p) => p.id === action.targetPlayerId)
      ?.activeShield
      ? -2
      : 0;
    return {
      score:
        HEURISTIC_BAND_WEIGHTS.pressure +
        damage -
        cost / PRESSURE_COST_DIVISOR +
        onTop +
        retaliateBonus +
        knownFinishBonus +
        shieldPenalty,
      code: 'pressure',
    };
  }

  // Tax — farm engine; prefer upgraded; refuse when reserve would break after other spends only.
  if (cardId === 'tax') {
    const taxBuffer = taxLifeBufferForKit(getKit(view.self.kitId).startingResources.lives);

    if (view.self.lives > ctx.incomingThreat + taxBuffer) {
      const upgradeBias = isUpgraded ? 25 : 0;
      // In contest, still Tax but below defense upgrades / Mirror.
      const contestPenalty = ctx.stance === 'contest' ? -15 : 0;
      const finishPenalty = ctx.stance === 'finish' ? -40 : 0;
      return {
        score:
          HEURISTIC_BAND_WEIGHTS.invest +
          TAX_INVEST_BONUS +
          upgradeBias +
          contestPenalty +
          finishPenalty,
        code: 'invest',
      };
    }

    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Other self / utility
  if (cardId === 'regeneration') {
    // Soft top-up when lives are low (Imposition drip / post-Tax floor) — ONMMBZ bots
    // drew to death with Regen in hand.
    const regenSoftLife = regenSoftLifeForKit(getKit(view.self.kitId).startingResources.lives);

    if (view.self.lives <= regenSoftLife || (isUpgraded && view.self.lives <= regenSoftLife + 2)) {
      return {
        score:
          HEURISTIC_BAND_WEIGHTS.invest +
          50 +
          (action.quantity ?? 0) +
          (isUpgraded ? 20 : 0),
        code: 'invest',
      };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain + (action.quantity ?? 0) + (isUpgraded ? 5 : 0),
      code: 'sustain',
    };
  }

  if (cardId === 'shield' || cardId === 'mirror') {
    const contestBias = ctx.stance === 'contest' ? 40 : 0;
    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain + 2 + contestBias + (isUpgraded ? 10 : 0),
      code: 'sustain',
    };
  }

  // Never rng-tie with draw for an unscored playCard.
  return {
    score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
    code: 'sustain',
  };
}
