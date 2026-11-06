/**
 * Hint dismiss causes on the arena: technical spec v7 §6.12 (the L46 auto-dismiss rules); Lot 75 plan
 * A.9.2, ruling R11 (L75-06). V2 parity: the `noteHintCause` call sites in `screens/table.tsx`.
 */
import { describe, expect, it } from 'vitest';

import type { HintDismissCause } from '../../view-model/select-hint';
import { makeCard } from '../../view-model/test-fixtures';
import type { ArenaIntent } from './arena-commit';
import { hintCauseForCardSheet, hintCauseForIntent } from './arena-hint-causes';
import type { CardSheetSource } from './card-sheet-source';

const PLAYING = 'playing-intent';
const SPY = makeCard('spy');

describe('hintCauseForIntent (A.9.2)', () => {
  it.each<{ label: string; intent: ArenaIntent; cause: HintDismissCause | null }>([
    { label: 'drawCard', intent: { kind: 'drawCard' }, cause: 'draw' },
    { label: 'playCard', intent: { kind: 'playCard', payload: { instanceId: 'c1', targetPlayerId: 'p1' } }, cause: PLAYING },
    { label: 'playMultipleAttacks', intent: { kind: 'playMultipleAttacks', payload: { attacks: [{ instanceId: 'c1', targetPlayerId: 'p1' }] } }, cause: PLAYING },
    { label: 'sellCard', intent: { kind: 'sellCard', payload: { instanceId: 'c1' } }, cause: PLAYING },
    { label: 'upgradeCard', intent: { kind: 'upgradeCard', payload: { instanceId: 'c1' } }, cause: PLAYING },
    { label: 'buyCard', intent: { kind: 'buyCard', payload: { cardId: 'spy' } }, cause: PLAYING },
    { label: 'buyUpgradePoint', intent: { kind: 'buyUpgradePoint' }, cause: PLAYING },
    { label: 'sellUpgradePoint', intent: { kind: 'sellUpgradePoint' }, cause: PLAYING },
    { label: 'buySpecialCard', intent: { kind: 'buySpecialCard' }, cause: PLAYING },
    { label: 'buyPoolCard', intent: { kind: 'buyPoolCard' }, cause: PLAYING },
    { label: 'clearSpy (Unspy)', intent: { kind: 'clearSpy', payload: { targetPlayerId: 'p1' } }, cause: PLAYING },
    { label: 'deactivatePersistent', intent: { kind: 'deactivatePersistent', payload: { effectId: 'e1' } }, cause: null },
    { label: 'activateDuplication', intent: { kind: 'activateDuplication' }, cause: null },
    { label: 'a reward answer', intent: { kind: 'resolveSubChoice', payload: { kind: 'elimination-reward', eliminationId: 'el-1', choices: [{ type: 'lives' }, { type: 'points' }] } }, cause: 'confirm-reward' },
    { label: 'a Mirror answer', intent: { kind: 'resolveSubChoice', payload: { kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p2' } }, cause: null },
  ])('$label → $cause', ({ intent, cause }) => {
    expect(hintCauseForIntent(intent)).toBe(cause);
  });
});

describe('hintCauseForCardSheet (A.9.2)', () => {
  it.each<{ label: string; source: CardSheetSource; cause: HintDismissCause | null }>([
    { label: 'hand', source: { kind: 'hand', instance: SPY }, cause: 'inspect-hand' },
    { label: 'special', source: { kind: 'special', instance: makeCard('poison') }, cause: 'inspect-special' },
    { label: 'in-play', source: { kind: 'in-play', thumb: { ref: { zone: 'shield', ownerPlayerId: 'me', isUpgraded: false }, instance: makeCard('shield'), badge: null, activatedArt: false } }, cause: null },
    { label: 'spy-reveal', source: { kind: 'spy-reveal', instance: SPY, ownerPlayerId: 'p1' }, cause: null },
    { label: 'queue', source: { kind: 'queue', effectId: 'e1', cardId: 'spy', isUpgraded: false }, cause: null },
    { label: 'log', source: { kind: 'log', cardId: 'spy', isUpgraded: false }, cause: null },
    { label: 'pool', source: { kind: 'pool', instance: SPY }, cause: null },
    { label: 'shop', source: { kind: 'shop', cardId: 'spy', isUpgraded: false }, cause: null },
  ])('$label → $cause', ({ source, cause }) => {
    expect(hintCauseForCardSheet(source)).toBe(cause);
  });
});
