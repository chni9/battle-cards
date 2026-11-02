/**
 * Own-intent FX requests: technical spec v7 §6.6.2, §6.6.3; Appendix A `table-fx-card-ghosts`;
 * Lot 74 plan A.9.3 (L74-17).
 */
import { describe, expect, it } from 'vitest';

import type { ArenaIntent } from './arena-commit';
import { ownIntentFxFor } from './own-intent-fx';

describe('ownIntentFxFor (L74-17)', () => {
  it('flies a play from its drop point, a multi-attack per attack, a sell and the two buys', () => {
    const drop = { instanceId: 'tax-1', dropPoint: { x: 150, y: 340 } };
    expect(ownIntentFxFor({ kind: 'playCard', payload: { instanceId: 'tax-1' } }, drop)).toEqual({ kind: 'play', instanceId: 'tax-1', origin: { x: 150, y: 340 } });
    expect(ownIntentFxFor({ kind: 'playCard', payload: { instanceId: 'spy-1', targetPlayerId: 'p2' } }, { instanceId: 'spy-1' })).toEqual({ kind: 'play', instanceId: 'spy-1' });
    expect(ownIntentFxFor({ kind: 'playMultipleAttacks', payload: { attacks: [{ instanceId: 'a-1', targetPlayerId: 'p1' }, { instanceId: 'a-2', targetPlayerId: 'p2' }] } }, { instanceId: 'a-1' }))
      .toEqual({ kind: 'multi-attack', instanceIds: ['a-1', 'a-2'] });
    expect(ownIntentFxFor({ kind: 'sellCard', payload: { instanceId: 'atk-1' } }, { instanceId: 'atk-1' })).toEqual({ kind: 'sell', instanceId: 'atk-1' });
    expect(ownIntentFxFor({ kind: 'buyCard', payload: { cardId: 'spy' } }, {})).toEqual({ kind: 'buy-card', cardId: 'spy' });
    expect(ownIntentFxFor({ kind: 'buySpecialCard' }, {})).toEqual({ kind: 'buy-special' });
  });

  it.each<ArenaIntent>([
    { kind: 'upgradeCard', payload: { instanceId: 'spy-1' } },
    { kind: 'drawCard' },
    { kind: 'clearSpy', payload: { targetPlayerId: 'p1' } },
    { kind: 'deactivatePersistent', payload: { effectId: 'eff-1' } },
    { kind: 'activateDuplication' },
    { kind: 'buyUpgradePoint' },
    { kind: 'sellUpgradePoint' },
    { kind: 'buyPoolCard' },
    { kind: 'resolveSubChoice', payload: { kind: 'slot-drop', cancel: true } },
  ])('flies nothing for $kind (V2: these fly no card)', (intent) => {
    expect(ownIntentFxFor(intent, {})).toBeNull();
  });
});
