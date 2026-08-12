/**
 * Policy registry — technical spec v5 §7.1 (L32-02).
 * Room, BotDriver, and simulator resolve policies here — never import heuristic
 * free functions at those call sites (parity, decisions.md 2026-08-05).
 */

import type { BotPolicy } from './policy-types';
import {
  HEURISTIC_TUNED_V5_POLICY_ID,
  heuristicTunedV5Policy,
} from './policies/heuristic-tuned-v5';
import {
  HEURISTIC_V4_POLICY_ID,
  heuristicV4Policy,
} from './policies/heuristic-v4';
import {
  RANDOM_LEGAL_POLICY_ID,
  randomLegalPolicy,
} from './policies/random-legal';

export {
  HEURISTIC_TUNED_V5_POLICY_ID,
  HEURISTIC_V4_POLICY_ID,
  RANDOM_LEGAL_POLICY_ID,
};

/** Default room / solo policy — stays `heuristic-v4` until L33-05 gate passes. */
export const DEFAULT_POLICY_ID = HEURISTIC_V4_POLICY_ID;

const policies = new Map<string, BotPolicy>();

export function registerPolicy(policy: BotPolicy): void {
  if (policies.has(policy.id)) {
    throw new Error(`Policy already registered: ${policy.id}`);
  }

  policies.set(policy.id, policy);
}

export function getPolicy(id: string): BotPolicy {
  const policy = policies.get(id);

  if (policy === undefined) {
    throw new Error(`Unknown bot policy: ${id}`);
  }

  return policy;
}

export function getDefaultPolicy(): BotPolicy {
  return getPolicy(DEFAULT_POLICY_ID);
}

export function listPolicyIds(): readonly string[] {
  return [...policies.keys()].sort();
}

registerPolicy(heuristicV4Policy);
registerPolicy(heuristicTunedV5Policy);
registerPolicy(randomLegalPolicy);
