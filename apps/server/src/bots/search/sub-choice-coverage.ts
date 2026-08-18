/**
 * Sub-choice search coverage — technical spec v5 §10.5 (L35-06).
 * Adding a SubChoiceKind without a search handler fails the companion test.
 */

import type { SubChoiceKind } from '@card-battle/shared';

/**
 * Every `SubChoiceKind` that must be reachable as a search node.
 * Keep in sync with `packages/shared/src/domain/sub-choice.ts`.
 */
export const SEARCH_SUB_CHOICE_KINDS = [
  'mirror',
  'elimination-reward',
  'pool-pick',
  'steal-pick',
  'special-pick',
  'reanimation-kit',
] as const satisfies readonly SubChoiceKind[];

export type SearchSubChoiceKind = (typeof SEARCH_SUB_CHOICE_KINDS)[number];

/**
 * Handlers that list/apply must cover. Values are intentional markers —
 * the exhaustiveness of this record is the coverage gate.
 */
export const SEARCH_SUB_CHOICE_HANDLERS = {
  mirror: true,
  'elimination-reward': true,
  'pool-pick': true,
  'steal-pick': true,
  'special-pick': true,
  'reanimation-kit': true,
} as const satisfies Record<SubChoiceKind, true>;

export function assertSearchSubChoiceCoverage(): void {
  for (const kind of SEARCH_SUB_CHOICE_KINDS) {
    const handled: true = SEARCH_SUB_CHOICE_HANDLERS[kind];
    void handled;
  }
}
