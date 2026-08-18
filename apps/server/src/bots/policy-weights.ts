/**
 * Typed policy weights — technical spec v5 §5.2 (L33-01).
 *
 * Minimal #V3-5 reopen: module constants remain the frozen default; profiles are
 * checked-in JSON only. Room path never loads from env or network.
 */

import { REFERENCE_STARTING_LIVES } from './heuristic-life-thresholds';
import { defaultEvaluatorLinearWeights } from './eval/features';
import {
  ABSORBER_MIN_LIVES_VS_REGEN,
  ABSORBER_POINTS_DENY_BONUS,
  ABSORBER_UP_DENY_BONUS,
  ACTIVATE_DUPLICATION_INVEST_BONUS,
  ATTACK_THIEF_DENY_BONUS,
  ATTACK_THIEF_INTEL_BONUS,
  ATTACK_THIEF_SURVIVE_BONUS,
  BLOCK_INVEST_BONUS,
  BLOCK_SURVIVE_BONUS,
  BURN_COUNTER_BONUS,
  BUY_SPECIAL_POINTS_FLOOR,
  BUY_UPGRADE_POINT_BONUS,
  CARD_ABSORBER_INVEST_BONUS,
  CARD_ABSORBER_MAX_BONUS_CARDS,
  CARD_ABSORBER_PER_CARD_BONUS,
  CARD_THIEF_DENY_BONUS,
  CARD_TRANSFORMER_INVEST_BONUS,
  CONTEST_UPGRADE_EXTRA,
  CURSE_DENY_BONUS,
  CURSE_HIGH_SPEND_THRESHOLD,
  CURSE_INVEST_BONUS,
  DEACTIVATE_PERSISTENT_INVEST_BONUS,
  DEACTIVATE_PERSISTENT_POINTS_FLOOR,
  DENY_ABSORBER_MIN_LIVES_LOST,
  DRAW_SCORE_PER_EXTRA_DRAW,
  FINISH_CHIP_BONUS,
  HEURISTIC_BAND_WEIGHTS,
  IMPOSITION_INVEST_BONUS,
  INVISIBILITY_INVEST_BONUS,
  MEGA_ATTACK_PRESSURE_PER_OPPONENT,
  MUTUAL_CANCEL_BONUS,
  POINTS_GENERATOR_INVEST_BONUS,
  POISON_INVEST_BONUS,
  POISON_MULTI_TARGET_BONUS,
  PRESSURE_COST_DIVISOR,
  REANIMATION_INVEST_BONUS,
  REANIMATION_LOW_LIFE_BONUS,
  REANIMATION_LOW_LIFE_FLOOR,
  REGEN_SOFT_LIFE,
  SELL_TO_FUND_BONUS,
  SENTENCE_UPGRADED_PER_OPPONENT,
  SPY_THIEF_DENY_BONUS,
  SPY_TOP_THREAT_BONUS,
  SPY_UNSPIED_BONUS,
  STRIKE_MIN_DAMAGE,
  SUPER_ABSORBER_BASELINE_DENY_BONUS,
  SUPER_ABSORBER_POINTS_DENY_BONUS,
  SUPER_ABSORBER_UP_DENY_BONUS,
  SUPER_MIRROR_SURVIVE_BONUS,
  SUPER_MIRROR_UPGRADED_BONUS,
  SUPER_REGEN_INVEST_BONUS,
  SUPER_REGEN_SURVIVE_BONUS,
  TAX_INVEST_BONUS,
  TAX_LIFE_BUFFER,
  UNSCORED_PLAY_PENALTY,
  UPGRADE_ABSORBER_BONUS,
  UPGRADE_ATTACK_BONUS,
  UPGRADE_MIRROR_BONUS,
  UPGRADE_POINT_THIEF_DENY_BONUS,
  UPGRADE_REGEN_BONUS,
  UPGRADE_SENTENCE_BONUS,
  UPGRADE_SHIELD_BONUS,
  UPGRADE_TAX_BONUS,
} from './heuristic-weights';

/** Band base scores — same keys as `HEURISTIC_BAND_WEIGHTS`. */
export interface PolicyBandWeights {
  readonly lethalNow: number;
  readonly survive: number;
  readonly deny: number;
  readonly pressure: number;
  readonly invest: number;
  readonly sustain: number;
}

/**
 * Action-scoring tunables — values byte-identical to `heuristic-weights.ts` exports
 * in the default profile. Inline score-play literals stay in code (L33-01 scope).
 */
export interface PolicyActionWeights {
  readonly bands: PolicyBandWeights;
  readonly buySpecialPointsFloor: number;
  readonly taxLifeBuffer: number;
  readonly denyAbsorberMinLivesLost: number;
  readonly pressureCostDivisor: number;
  readonly strikeMinDamage: number;
  readonly taxInvestBonus: number;
  readonly buyUpgradePointBonus: number;
  readonly upgradeAttackBonus: number;
  readonly spyUnspiedBonus: number;
  readonly spyTopThreatBonus: number;
  readonly sellToFundBonus: number;
  readonly regenSoftLife: number;
  readonly burnCounterBonus: number;
  readonly mutualCancelBonus: number;
  readonly impositionInvestBonus: number;
  readonly pointsGeneratorInvestBonus: number;
  readonly spyThiefDenyBonus: number;
  readonly unscoredPlayPenalty: number;
  readonly upgradeTaxBonus: number;
  readonly upgradeRegenBonus: number;
  readonly upgradeMirrorBonus: number;
  readonly upgradeShieldBonus: number;
  readonly upgradeAbsorberBonus: number;
  readonly upgradeSentenceBonus: number;
  readonly contestUpgradeExtra: number;
  readonly absorberUpDenyBonus: number;
  readonly absorberPointsDenyBonus: number;
  readonly finishChipBonus: number;
  readonly absorberMinLivesVsRegen: number;
  readonly drawScorePerExtraDraw: number;
  readonly superRegenInvestBonus: number;
  readonly superRegenSurviveBonus: number;
  readonly upgradePointThiefDenyBonus: number;
  readonly cardThiefDenyBonus: number;
  readonly poisonInvestBonus: number;
  readonly poisonMultiTargetBonus: number;
  readonly curseDenyBonus: number;
  readonly curseInvestBonus: number;
  readonly curseHighSpendThreshold: number;
  readonly superAbsorberUpDenyBonus: number;
  readonly superAbsorberPointsDenyBonus: number;
  readonly superAbsorberBaselineDenyBonus: number;
  readonly sentenceUpgradedPerOpponent: number;
  readonly megaAttackPressurePerOpponent: number;
  readonly superMirrorSurviveBonus: number;
  readonly superMirrorUpgradedBonus: number;
  readonly attackThiefSurviveBonus: number;
  readonly attackThiefDenyBonus: number;
  readonly attackThiefIntelBonus: number;
  readonly blockSurviveBonus: number;
  readonly blockInvestBonus: number;
  readonly invisibilityInvestBonus: number;
  readonly cardAbsorberInvestBonus: number;
  readonly cardAbsorberPerCardBonus: number;
  readonly cardAbsorberMaxBonusCards: number;
  readonly cardTransformerInvestBonus: number;
  readonly reanimationInvestBonus: number;
  readonly reanimationLowLifeFloor: number;
  readonly reanimationLowLifeBonus: number;
  readonly deactivatePersistentInvestBonus: number;
  readonly deactivatePersistentPointsFloor: number;
  readonly activateDuplicationInvestBonus: number;
}

export interface PolicyLifeThresholdWeights {
  readonly referenceStartingLives: number;
}

/**
 * Phase A linear evaluator + #V5-7 survival term.
 * `linearWeights` length is fixed when `FEATURE_LAYOUT_VERSION` lands (L33-02).
 * Lot 37: optional `kind` / `fittedModelId` select fitted inference (default linear).
 */
export type EvaluatorKind = 'linear' | 'fitted-logistic' | 'fitted-gbdt';

export interface PolicyEvaluatorWeights {
  /** Absent / undefined → linear (Phase A). */
  readonly kind?: EvaluatorKind;
  readonly survivalTermWeight: number;
  readonly linearWeights: readonly number[];
  /** Checked-in id under `bots/eval/models/` when kind is fitted-*. */
  readonly fittedModelId?: string;
}

/** Search hypers — present for a stable schema; unused until Lot 35. */
export interface PolicySearchWeights {
  /** PUCT exploration constant — inert until Lot 35. */
  readonly explorationConstant: number;
  /** Prior softmax temperature τ — inert until Lot 35. */
  readonly priorTemperature: number;
  /** Depth floor in complete rounds — inert until Lot 35; must stay ≥ 2 when used. */
  readonly depthCapRounds: number;
}

export interface PolicyWeights {
  readonly action: PolicyActionWeights;
  readonly lifeThresholds: PolicyLifeThresholdWeights;
  readonly evaluator: PolicyEvaluatorWeights;
  readonly search: PolicySearchWeights;
}

/** Keys under `action` (plus nested `bands.*`) that L33-03 may mutate. */
export const ACTION_WEIGHT_SCALAR_KEYS = [
  'buySpecialPointsFloor',
  'taxLifeBuffer',
  'denyAbsorberMinLivesLost',
  'pressureCostDivisor',
  'strikeMinDamage',
  'taxInvestBonus',
  'buyUpgradePointBonus',
  'upgradeAttackBonus',
  'spyUnspiedBonus',
  'spyTopThreatBonus',
  'sellToFundBonus',
  'regenSoftLife',
  'burnCounterBonus',
  'mutualCancelBonus',
  'impositionInvestBonus',
  'pointsGeneratorInvestBonus',
  'spyThiefDenyBonus',
  'unscoredPlayPenalty',
  'upgradeTaxBonus',
  'upgradeRegenBonus',
  'upgradeMirrorBonus',
  'upgradeShieldBonus',
  'upgradeAbsorberBonus',
  'upgradeSentenceBonus',
  'contestUpgradeExtra',
  'absorberUpDenyBonus',
  'absorberPointsDenyBonus',
  'finishChipBonus',
  'absorberMinLivesVsRegen',
  'drawScorePerExtraDraw',
  'superRegenInvestBonus',
  'superRegenSurviveBonus',
  'upgradePointThiefDenyBonus',
  'cardThiefDenyBonus',
  'poisonInvestBonus',
  'poisonMultiTargetBonus',
  'curseDenyBonus',
  'curseInvestBonus',
  'curseHighSpendThreshold',
  'superAbsorberUpDenyBonus',
  'superAbsorberPointsDenyBonus',
  'superAbsorberBaselineDenyBonus',
  'sentenceUpgradedPerOpponent',
  'megaAttackPressurePerOpponent',
  'superMirrorSurviveBonus',
  'superMirrorUpgradedBonus',
  'attackThiefSurviveBonus',
  'attackThiefDenyBonus',
  'attackThiefIntelBonus',
  'blockSurviveBonus',
  'blockInvestBonus',
  'invisibilityInvestBonus',
  'cardAbsorberInvestBonus',
  'cardAbsorberPerCardBonus',
  'cardAbsorberMaxBonusCards',
  'cardTransformerInvestBonus',
  'reanimationInvestBonus',
  'reanimationLowLifeFloor',
  'reanimationLowLifeBonus',
  'deactivatePersistentInvestBonus',
  'deactivatePersistentPointsFloor',
  'activateDuplicationInvestBonus',
] as const satisfies readonly (keyof Omit<PolicyActionWeights, 'bands'>)[];

export const BAND_WEIGHT_KEYS = [
  'lethalNow',
  'survive',
  'deny',
  'pressure',
  'invest',
  'sustain',
] as const satisfies readonly (keyof PolicyBandWeights)[];

/** Default search placeholders — documented, unused until Lot 35. */
export const DEFAULT_SEARCH_WEIGHTS: PolicySearchWeights = {
  explorationConstant: 1.25,
  priorTemperature: 1,
  depthCapRounds: 2,
};

export function defaultPolicyWeights(): PolicyWeights {
  return {
    action: {
      bands: {
        lethalNow: HEURISTIC_BAND_WEIGHTS.lethalNow,
        survive: HEURISTIC_BAND_WEIGHTS.survive,
        deny: HEURISTIC_BAND_WEIGHTS.deny,
        pressure: HEURISTIC_BAND_WEIGHTS.pressure,
        invest: HEURISTIC_BAND_WEIGHTS.invest,
        sustain: HEURISTIC_BAND_WEIGHTS.sustain,
      },
      buySpecialPointsFloor: BUY_SPECIAL_POINTS_FLOOR,
      taxLifeBuffer: TAX_LIFE_BUFFER,
      denyAbsorberMinLivesLost: DENY_ABSORBER_MIN_LIVES_LOST,
      pressureCostDivisor: PRESSURE_COST_DIVISOR,
      strikeMinDamage: STRIKE_MIN_DAMAGE,
      taxInvestBonus: TAX_INVEST_BONUS,
      buyUpgradePointBonus: BUY_UPGRADE_POINT_BONUS,
      upgradeAttackBonus: UPGRADE_ATTACK_BONUS,
      spyUnspiedBonus: SPY_UNSPIED_BONUS,
      spyTopThreatBonus: SPY_TOP_THREAT_BONUS,
      sellToFundBonus: SELL_TO_FUND_BONUS,
      regenSoftLife: REGEN_SOFT_LIFE,
      burnCounterBonus: BURN_COUNTER_BONUS,
      mutualCancelBonus: MUTUAL_CANCEL_BONUS,
      impositionInvestBonus: IMPOSITION_INVEST_BONUS,
      pointsGeneratorInvestBonus: POINTS_GENERATOR_INVEST_BONUS,
      spyThiefDenyBonus: SPY_THIEF_DENY_BONUS,
      unscoredPlayPenalty: UNSCORED_PLAY_PENALTY,
      upgradeTaxBonus: UPGRADE_TAX_BONUS,
      upgradeRegenBonus: UPGRADE_REGEN_BONUS,
      upgradeMirrorBonus: UPGRADE_MIRROR_BONUS,
      upgradeShieldBonus: UPGRADE_SHIELD_BONUS,
      upgradeAbsorberBonus: UPGRADE_ABSORBER_BONUS,
      upgradeSentenceBonus: UPGRADE_SENTENCE_BONUS,
      contestUpgradeExtra: CONTEST_UPGRADE_EXTRA,
      absorberUpDenyBonus: ABSORBER_UP_DENY_BONUS,
      absorberPointsDenyBonus: ABSORBER_POINTS_DENY_BONUS,
      finishChipBonus: FINISH_CHIP_BONUS,
      absorberMinLivesVsRegen: ABSORBER_MIN_LIVES_VS_REGEN,
      drawScorePerExtraDraw: DRAW_SCORE_PER_EXTRA_DRAW,
      superRegenInvestBonus: SUPER_REGEN_INVEST_BONUS,
      superRegenSurviveBonus: SUPER_REGEN_SURVIVE_BONUS,
      upgradePointThiefDenyBonus: UPGRADE_POINT_THIEF_DENY_BONUS,
      cardThiefDenyBonus: CARD_THIEF_DENY_BONUS,
      poisonInvestBonus: POISON_INVEST_BONUS,
      poisonMultiTargetBonus: POISON_MULTI_TARGET_BONUS,
      curseDenyBonus: CURSE_DENY_BONUS,
      curseInvestBonus: CURSE_INVEST_BONUS,
      curseHighSpendThreshold: CURSE_HIGH_SPEND_THRESHOLD,
      superAbsorberUpDenyBonus: SUPER_ABSORBER_UP_DENY_BONUS,
      superAbsorberPointsDenyBonus: SUPER_ABSORBER_POINTS_DENY_BONUS,
      superAbsorberBaselineDenyBonus: SUPER_ABSORBER_BASELINE_DENY_BONUS,
      sentenceUpgradedPerOpponent: SENTENCE_UPGRADED_PER_OPPONENT,
      megaAttackPressurePerOpponent: MEGA_ATTACK_PRESSURE_PER_OPPONENT,
      superMirrorSurviveBonus: SUPER_MIRROR_SURVIVE_BONUS,
      superMirrorUpgradedBonus: SUPER_MIRROR_UPGRADED_BONUS,
      attackThiefSurviveBonus: ATTACK_THIEF_SURVIVE_BONUS,
      attackThiefDenyBonus: ATTACK_THIEF_DENY_BONUS,
      attackThiefIntelBonus: ATTACK_THIEF_INTEL_BONUS,
      blockSurviveBonus: BLOCK_SURVIVE_BONUS,
      blockInvestBonus: BLOCK_INVEST_BONUS,
      invisibilityInvestBonus: INVISIBILITY_INVEST_BONUS,
      cardAbsorberInvestBonus: CARD_ABSORBER_INVEST_BONUS,
      cardAbsorberPerCardBonus: CARD_ABSORBER_PER_CARD_BONUS,
      cardAbsorberMaxBonusCards: CARD_ABSORBER_MAX_BONUS_CARDS,
      cardTransformerInvestBonus: CARD_TRANSFORMER_INVEST_BONUS,
      reanimationInvestBonus: REANIMATION_INVEST_BONUS,
      reanimationLowLifeFloor: REANIMATION_LOW_LIFE_FLOOR,
      reanimationLowLifeBonus: REANIMATION_LOW_LIFE_BONUS,
      deactivatePersistentInvestBonus: DEACTIVATE_PERSISTENT_INVEST_BONUS,
      deactivatePersistentPointsFloor: DEACTIVATE_PERSISTENT_POINTS_FLOOR,
      activateDuplicationInvestBonus: ACTIVATE_DUPLICATION_INVEST_BONUS,
    },
    lifeThresholds: {
      referenceStartingLives: REFERENCE_STARTING_LIVES,
    },
    evaluator: {
      survivalTermWeight: 0,
      linearWeights: defaultEvaluatorLinearWeights(),
    },
    search: { ...DEFAULT_SEARCH_WEIGHTS },
  };
}

/** Frozen default — same values as today's module constants. */
export const DEFAULT_POLICY_WEIGHTS: PolicyWeights = defaultPolicyWeights();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`PolicyWeights.${path}.${key} must be a finite number`);
  }

  return value;
}

function parseBands(raw: unknown): PolicyBandWeights {
  if (!isPlainObject(raw)) {
    throw new Error('PolicyWeights.action.bands must be an object');
  }

  return {
    lethalNow: requireNumber(raw, 'lethalNow', 'action.bands'),
    survive: requireNumber(raw, 'survive', 'action.bands'),
    deny: requireNumber(raw, 'deny', 'action.bands'),
    pressure: requireNumber(raw, 'pressure', 'action.bands'),
    invest: requireNumber(raw, 'invest', 'action.bands'),
    sustain: requireNumber(raw, 'sustain', 'action.bands'),
  };
}

function parseAction(raw: unknown): PolicyActionWeights {
  if (!isPlainObject(raw)) {
    throw new Error('PolicyWeights.action must be an object');
  }

  const bands = parseBands(raw['bands']);
  const action: Record<string, unknown> = { bands };

  for (const key of ACTION_WEIGHT_SCALAR_KEYS) {
    action[key] = requireNumber(raw, key, 'action');
  }

  return action as unknown as PolicyActionWeights;
}

function parseLifeThresholds(raw: unknown): PolicyLifeThresholdWeights {
  if (!isPlainObject(raw)) {
    throw new Error('PolicyWeights.lifeThresholds must be an object');
  }

  return {
    referenceStartingLives: requireNumber(raw, 'referenceStartingLives', 'lifeThresholds'),
  };
}

function parseEvaluator(raw: unknown): PolicyEvaluatorWeights {
  if (!isPlainObject(raw)) {
    throw new Error('PolicyWeights.evaluator must be an object');
  }

  const linearRaw = raw['linearWeights'];

  if (!Array.isArray(linearRaw) || !linearRaw.every((entry): entry is number => typeof entry === 'number')) {
    throw new Error('PolicyWeights.evaluator.linearWeights must be a number array');
  }

  const kindRaw = raw['kind'];
  let kind: EvaluatorKind | undefined;

  if (kindRaw !== undefined) {
    if (
      kindRaw !== 'linear' &&
      kindRaw !== 'fitted-logistic' &&
      kindRaw !== 'fitted-gbdt'
    ) {
      throw new Error(
        `PolicyWeights.evaluator.kind invalid: ${typeof kindRaw === 'string' ? kindRaw : typeof kindRaw}`,
      );
    }

    kind = kindRaw;
  }

  const fittedModelIdRaw = raw['fittedModelId'];
  let fittedModelId: string | undefined;

  if (fittedModelIdRaw !== undefined) {
    if (typeof fittedModelIdRaw !== 'string' || fittedModelIdRaw === '') {
      throw new Error('PolicyWeights.evaluator.fittedModelId must be a non-empty string');
    }

    fittedModelId = fittedModelIdRaw;
  }

  return {
    ...(kind !== undefined ? { kind } : {}),
    survivalTermWeight: requireNumber(raw, 'survivalTermWeight', 'evaluator'),
    linearWeights: linearRaw,
    ...(fittedModelId !== undefined ? { fittedModelId } : {}),
  };
}

function parseSearch(raw: unknown): PolicySearchWeights {
  if (!isPlainObject(raw)) {
    throw new Error('PolicyWeights.search must be an object');
  }

  return {
    explorationConstant: requireNumber(raw, 'explorationConstant', 'search'),
    priorTemperature: requireNumber(raw, 'priorTemperature', 'search'),
    depthCapRounds: requireNumber(raw, 'depthCapRounds', 'search'),
  };
}

const ROOT_KEYS = new Set(['action', 'lifeThresholds', 'evaluator', 'search']);

/** Parse and validate a JSON profile object. Rejects unknown root keys. */
export function parsePolicyWeights(raw: unknown): PolicyWeights {
  if (!isPlainObject(raw)) {
    throw new Error('PolicyWeights root must be an object');
  }

  for (const key of Object.keys(raw)) {
    if (!ROOT_KEYS.has(key)) {
      throw new Error(`Unknown PolicyWeights key: ${key}`);
    }
  }

  return {
    action: parseAction(raw['action']),
    lifeThresholds: parseLifeThresholds(raw['lifeThresholds']),
    evaluator: parseEvaluator(raw['evaluator']),
    search: parseSearch(raw['search']),
  };
}

export function clonePolicyWeights(weights: PolicyWeights): PolicyWeights {
  return parsePolicyWeights(JSON.parse(JSON.stringify(weights)) as unknown);
}
