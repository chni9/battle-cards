/**
 * Information-set keys for ISMCTS — technical spec v5 §6.1 (L35-01 scaffold).
 * Must not encode hidden cards; only owner, decision kind, and legal fingerprint.
 */

import type { SearchDecision } from './search-types';

export function searchDecisionKey(decision: SearchDecision): string {
  switch (decision.kind) {
    case 'action':
      return `action:${JSON.stringify(decision.action)}`;
    case 'mirror':
      return `mirror:${decision.pendingEffectId}->${decision.newTargetPlayerId}`;
    case 'steal-pick':
      return `steal:${decision.instanceId}`;
    case 'pool-pick':
      return `pool:${[...decision.instanceIds].sort().join(',')}`;
    case 'special-pick':
      return `special:${decision.cardId}`;
    case 'reanimation-kit':
      return `reanim:${decision.kitId}`;
    case 'elimination-reward':
      return `reward:${decision.chooserPlayerId}:${decision.eliminationId}:${JSON.stringify(decision.choices)}`;
  }
}

/**
 * Stable info-set key shared across re-determinizations (L35-02 fills fingerprint).
 */
export function infoSetKey(
  ownerPlayerId: string,
  decisionKind: SearchDecision['kind'],
  legalDecisionKeysSorted: readonly string[],
): string {
  return `${ownerPlayerId}|${decisionKind}|${legalDecisionKeysSorted.join(';')}`;
}
