/**
 * The tutorial gate's legal-kind mapping: technical spec v7 §6.12, §6.6.4; Lot 75 plan Appendix A.8.5
 * (L75-05). One row per ArenaIntent kind, then the cards the POV does not hold.
 */
import { ACTIVE_SHIELD_INSTANCE_ID } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCard, makePlayingView, makeSelf } from '../../view-model/test-fixtures';
import type { TutorialSendIntent } from '../../view-model/tutorial-coach-copy';
import type { ArenaIntent } from './arena-commit';
import { tutorialIntentOf } from './tutorial-gate';

const VIEW = makePlayingView({
  self: makeSelf({
    hand: [makeCard('basic-attack', { isUpgraded: true }), makeCard('shield'), makeCard('spy')],
    specialCards: [makeCard('super-regeneration')],
  }),
});
const OTHER: TutorialSendIntent = { kind: 'other' };

describe('tutorialIntentOf (A.8.5)', () => {
  it.each<{ label: string; intent: ArenaIntent; expected: TutorialSendIntent }>([
    { label: 'drawCard', intent: { kind: 'drawCard' }, expected: { kind: 'draw' } },
    { label: 'playCard: a held upgraded Basic', intent: { kind: 'playCard', payload: { instanceId: 'basic-attack-1', targetPlayerId: 'p1' } }, expected: { kind: 'playCard', cardId: 'basic-attack', isUpgraded: true } },
    { label: 'playCard: a held special', intent: { kind: 'playCard', payload: { instanceId: 'super-regeneration-1' } }, expected: { kind: 'playCard', cardId: 'super-regeneration', isUpgraded: false } },
    { label: 'sellCard', intent: { kind: 'sellCard', payload: { instanceId: 'shield-1' } }, expected: { kind: 'sellCard', cardId: 'shield' } },
    { label: 'upgradeCard: a held card', intent: { kind: 'upgradeCard', payload: { instanceId: 'spy-1' } }, expected: { kind: 'upgradeCard', cardId: 'spy' } },
    { label: 'buyCard', intent: { kind: 'buyCard', payload: { cardId: 'absorber' } }, expected: { kind: 'buyCard', cardId: 'absorber' } },
    { label: 'buyUpgradePoint', intent: { kind: 'buyUpgradePoint' }, expected: { kind: 'buyUpgradePoint' } },
    { label: 'playMultipleAttacks', intent: { kind: 'playMultipleAttacks', payload: { attacks: [] } }, expected: { kind: 'playMultipleAttacks' } },
    { label: 'sellUpgradePoint', intent: { kind: 'sellUpgradePoint' }, expected: { kind: 'sellUpgradePoint' } },
    { label: 'buySpecialCard', intent: { kind: 'buySpecialCard' }, expected: { kind: 'buySpecialCard' } },
    { label: 'buyPoolCard', intent: { kind: 'buyPoolCard' }, expected: OTHER },
    { label: 'clearSpy', intent: { kind: 'clearSpy', payload: { targetPlayerId: 'p1' } }, expected: OTHER },
    { label: 'deactivatePersistent', intent: { kind: 'deactivatePersistent', payload: { effectId: 'eff-poison' } }, expected: OTHER },
    { label: 'activateDuplication', intent: { kind: 'activateDuplication' }, expected: OTHER },
    { label: 'resolveSubChoice (never consulted: allows passes it outside the locks)', intent: { kind: 'resolveSubChoice', payload: { kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p1' } }, expected: OTHER },
    { label: 'playCard: a card the POV does not hold', intent: { kind: 'playCard', payload: { instanceId: 'gone' } }, expected: OTHER },
    { label: 'sellCard: a card the POV does not hold', intent: { kind: 'sellCard', payload: { instanceId: 'gone' } }, expected: OTHER },
    { label: 'upgradeCard: a card in play (the active Shield)', intent: { kind: 'upgradeCard', payload: { instanceId: ACTIVE_SHIELD_INSTANCE_ID } }, expected: OTHER },
  ])('$label', ({ intent, expected }) => {
    expect(tutorialIntentOf(intent, VIEW)).toEqual(expected);
  });
});
