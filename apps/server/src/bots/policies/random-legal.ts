/**
 * Uniform random legal policy — L32-02 second registry entry / arena foil.
 * View-only; never reads `GameState`. Uses injected `rng` only (golden rule 5).
 */

import type {
  CardInstance,
  KitId,
  PlayingStateView,
  SpecialCardId,
} from '@card-battle/shared';

import type { Rng } from '../../engine/rng';
import type { BotPolicy, PolicyDecideContext } from '../policy-types';
import { RANDOM_LEGAL_WEIGHTS_HASH } from '../weights-hash';

export const RANDOM_LEGAL_POLICY_ID = 'random-legal';

export const randomLegalPolicy: BotPolicy = {
  id: RANDOM_LEGAL_POLICY_ID,
  weightsHash: RANDOM_LEGAL_WEIGHTS_HASH,
  decide(view, actions, rng, ctx: PolicyDecideContext) {
    if (actions.length === 0) {
      throw new RangeError('random-legal decide received an empty action list');
    }

    void view;
    void ctx;
    return {
      action: rng.pick([...actions]),
      reason: { code: 'policy-fallback' },
    };
  },
  pickMirrorRedirect(view, rng, eligibleEffectIds?) {
    const eligible =
      eligibleEffectIds === undefined ? null : new Set(eligibleEffectIds);
    const incoming = view.pendingEffects.filter((effect) => {
      if (effect.targetPlayerId !== view.you) {
        return false;
      }

      if (eligible !== null && !eligible.has(effect.id)) {
        return false;
      }

      return true;
    });

    if (incoming.length === 0) {
      return null;
    }

    const effect = rng.pick(incoming);
    const opponents = view.players
      .filter((player) => player.id !== view.you && !player.isEliminated)
      .map((player) => player.id);

    if (opponents.length === 0) {
      return null;
    }

    return {
      pendingEffectId: effect.id,
      newTargetPlayerId: rng.pick(opponents),
      reason: { code: 'policy-fallback' },
    };
  },
  pickEliminationRewards(view, availableCards, lifeLimit, rng) {
    void view;
    void lifeLimit;

    const options: (
      | { type: 'lives' }
      | { type: 'points' }
      | { type: 'card'; instanceId: string }
    )[] = [{ type: 'lives' }, { type: 'points' }];

    for (const card of availableCards) {
      options.push({ type: 'card', instanceId: card.instanceId });
    }

    const first = rng.pick(options);
    const remaining = options.filter((option) => {
      if (first.type === 'card' && option.type === 'card') {
        return option.instanceId !== first.instanceId;
      }

      return option !== first;
    });
    const secondPool = remaining.length > 0 ? remaining : options;
    const second = rng.pick(secondPool);

    return {
      choices: [first, second],
      reason: { code: 'policy-fallback' },
    };
  },
  pickStealInstanceId(
    _view: PlayingStateView,
    eligibleInstanceIds: readonly string[],
    rng: Rng,
  ) {
    if (eligibleInstanceIds.length === 0) {
      throw new RangeError('random-legal steal received an empty candidate list');
    }

    return rng.pick([...eligibleInstanceIds]);
  },
  pickPoolInstanceIds(
    poolCards: readonly CardInstance[],
    eligibleIds: readonly string[],
    maxCount: number,
    rng: Rng,
  ) {
    if (maxCount <= 0) {
      return [];
    }

    const eligible = new Set(eligibleIds);
    const candidates = poolCards.filter((card) => eligible.has(card.instanceId));
    return rng.shuffle(candidates).slice(0, maxCount).map((card) => card.instanceId);
  },
  pickSpecialCardId(eligibleCardIds: readonly SpecialCardId[], rng: Rng) {
    if (eligibleCardIds.length === 0) {
      throw new RangeError('random-legal special pick received an empty candidate list');
    }

    return rng.pick([...eligibleCardIds]);
  },
  pickReanimationKitId(eligibleKitIds: readonly KitId[], rng: Rng) {
    if (eligibleKitIds.length === 0) {
      throw new RangeError('random-legal reanim kit received an empty candidate list');
    }

    return rng.pick([...eligibleKitIds]);
  },
};
