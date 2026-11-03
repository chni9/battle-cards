/**
 * createArenaCommit: technical spec v7 §6.6.4; Lot 74 plan Appendix A.6 (L74-08).
 */
import type { ResolveSubChoicePayload } from '@card-battle/shared';
import { describe, expect, it, vi } from 'vitest';

import { createArenaCommit, type ArenaCommitHooks, type ArenaIntentHandlers } from './arena-commit';

function makeHandlers() {
  return {
    onPlayCard: vi.fn<ArenaIntentHandlers['onPlayCard']>(),
    onSellCard: vi.fn<ArenaIntentHandlers['onSellCard']>(),
    onUpgradeCard: vi.fn<ArenaIntentHandlers['onUpgradeCard']>(),
    onPlayMultipleAttacks: vi.fn<ArenaIntentHandlers['onPlayMultipleAttacks']>(),
    onDraw: vi.fn<ArenaIntentHandlers['onDraw']>(),
    onClearSpy: vi.fn<ArenaIntentHandlers['onClearSpy']>(),
    onDeactivatePersistent: vi.fn<(effectId: string) => void>(),
    onActivateDuplication: vi.fn<() => void>(),
    onBuyCard: vi.fn<ArenaIntentHandlers['onBuyCard']>(),
    onBuyUpgradePoint: vi.fn<() => void>(),
    onSellUpgradePoint: vi.fn<() => void>(),
    onBuySpecialCard: vi.fn<() => void>(),
    onBuyPoolCard: vi.fn<() => void>(),
    onResolveSubChoice: vi.fn<ArenaIntentHandlers['onResolveSubChoice']>(),
  };
}
type Handlers = ReturnType<typeof makeHandlers>;
const NAMES = [
  'onPlayCard', 'onSellCard', 'onUpgradeCard', 'onPlayMultipleAttacks', 'onDraw', 'onClearSpy',
  'onDeactivatePersistent', 'onActivateDuplication', 'onBuyCard', 'onBuyUpgradePoint', 'onSellUpgradePoint',
  'onBuySpecialCard', 'onBuyPoolCard', 'onResolveSubChoice',
] as const satisfies readonly (keyof Handlers)[];

function expectOnly(handlers: Handlers, name: keyof Handlers): void {
  for (const other of NAMES) {
    if (other !== name) expect(handlers[other]).not.toHaveBeenCalled();
  }
}

/**
 * The required handlers alone. Built by hand: a rest-destructure would leave two unused bindings
 * that @typescript-eslint/no-unused-vars rejects (ignoreRestSiblings is off).
 */
function requiredOf(all: Handlers): ArenaIntentHandlers {
  return {
    onPlayCard: all.onPlayCard,
    onSellCard: all.onSellCard,
    onUpgradeCard: all.onUpgradeCard,
    onPlayMultipleAttacks: all.onPlayMultipleAttacks,
    onDraw: all.onDraw,
    onClearSpy: all.onClearSpy,
    onBuyCard: all.onBuyCard,
    onBuyUpgradePoint: all.onBuyUpgradePoint,
    onSellUpgradePoint: all.onSellUpgradePoint,
    onBuySpecialCard: all.onBuySpecialCard,
    onBuyPoolCard: all.onBuyPoolCard,
    onResolveSubChoice: all.onResolveSubChoice,
  };
}

describe('createArenaCommit (L74-08, Appendix A.6)', () => {
  it('maps a playCard with no option key to onPlayCard(instanceId) alone', () => {
    const handlers = makeHandlers();
    createArenaCommit(handlers)({ kind: 'playCard', payload: { instanceId: 'card-1' } });
    expect(handlers.onPlayCard.mock.calls).toStrictEqual([['card-1']]);
    expectOnly(handlers, 'onPlayCard');
  });

  it.each([
    { targetPlayerId: 'p1' },
    { quantity: 3 },
    { consumeInstanceId: 'card-2' },
    { targetPlayerId: 'p1', quantity: 2, consumeInstanceId: 'card-2' },
  ])('passes only the defined option keys: %o', (options) => {
    const handlers = makeHandlers();
    createArenaCommit(handlers)({ kind: 'playCard', payload: { instanceId: 'card-1', ...options } });
    expect(handlers.onPlayCard.mock.calls).toStrictEqual([['card-1', options]]);
    expectOnly(handlers, 'onPlayCard');
  });

  it('maps sellCard to onSellCard', () => {
    const handlers = makeHandlers();
    createArenaCommit(handlers)({ kind: 'sellCard', payload: { instanceId: 'card-1' } });
    expect(handlers.onSellCard.mock.calls).toStrictEqual([['card-1']]);
    expectOnly(handlers, 'onSellCard');
  });

  it('maps upgradeCard to onUpgradeCard, an in-play id included', () => {
    const handlers = makeHandlers();
    createArenaCommit(handlers)({ kind: 'upgradeCard', payload: { instanceId: 'active-shield' } });
    expect(handlers.onUpgradeCard.mock.calls).toStrictEqual([['active-shield']]);
    expectOnly(handlers, 'onUpgradeCard');
  });

  it('maps playMultipleAttacks to onPlayMultipleAttacks with the same attacks', () => {
    const handlers = makeHandlers();
    const attacks = [{ instanceId: 'a-1', targetPlayerId: 'p1' }, { instanceId: 'a-2', targetPlayerId: 'p1' }];
    createArenaCommit(handlers)({ kind: 'playMultipleAttacks', payload: { attacks } });
    expect(handlers.onPlayMultipleAttacks.mock.calls[0]?.[0]).toBe(attacks);
    expectOnly(handlers, 'onPlayMultipleAttacks');
  });

  it('maps deactivatePersistent, clearSpy, drawCard and activateDuplication', () => {
    const handlers = makeHandlers();
    const commit = createArenaCommit(handlers);
    commit({ kind: 'deactivatePersistent', payload: { effectId: 'eff-1' } });
    commit({ kind: 'clearSpy', payload: { targetPlayerId: 'p2' } });
    commit({ kind: 'drawCard' });
    commit({ kind: 'activateDuplication' });
    expect(handlers.onDeactivatePersistent.mock.calls).toStrictEqual([['eff-1']]);
    expect(handlers.onClearSpy.mock.calls).toStrictEqual([['p2']]);
    expect(handlers.onDraw.mock.calls).toStrictEqual([[]]);
    expect(handlers.onActivateDuplication.mock.calls).toStrictEqual([[]]);
    for (const name of ['onPlayCard', 'onSellCard', 'onUpgradeCard', 'onPlayMultipleAttacks'] as const) {
      expect(handlers[name]).not.toHaveBeenCalled();
    }
  });

  it('makes an intent without its optional handler a no-op', () => {
    const all = makeHandlers();
    const commit = createArenaCommit(requiredOf(all));
    expect(() => {
      commit({ kind: 'deactivatePersistent', payload: { effectId: 'eff-1' } });
      commit({ kind: 'activateDuplication' });
    }).not.toThrow();
    for (const name of NAMES) expect(all[name]).not.toHaveBeenCalled();
  });

  it('maps the shop intents to their handlers (L74-14, A.9.3)', () => {
    const handlers = makeHandlers();
    const commit = createArenaCommit(handlers);
    commit({ kind: 'buyCard', payload: { cardId: 'spy' } });
    commit({ kind: 'buyUpgradePoint' });
    commit({ kind: 'sellUpgradePoint' });
    commit({ kind: 'buySpecialCard' });
    commit({ kind: 'buyPoolCard' });
    expect(handlers.onBuyCard.mock.calls).toStrictEqual([['spy']]);
    for (const name of ['onBuyUpgradePoint', 'onSellUpgradePoint', 'onBuySpecialCard', 'onBuyPoolCard'] as const) {
      expect(handlers[name].mock.calls).toStrictEqual([[]]);
    }
    for (const name of ['onPlayCard', 'onSellCard', 'onUpgradeCard', 'onPlayMultipleAttacks', 'onDraw', 'onClearSpy'] as const) {
      expect(handlers[name]).not.toHaveBeenCalled();
    }
  });

  it('maps resolveSubChoice to onResolveSubChoice with the same payload (L74-18)', () => {
    const handlers = makeHandlers();
    const payload: ResolveSubChoicePayload = { kind: 'slot-drop', cancel: true };
    createArenaCommit(handlers)({ kind: 'resolveSubChoice', payload });
    expect(handlers.onResolveSubChoice.mock.calls[0]?.[0]).toBe(payload);
    expectOnly(handlers, 'onResolveSubChoice');
  });
});

describe('createArenaCommit hooks (L74-17, A.9.3)', () => {
  it('fires onSent after the send, with the context or {} (Lot 14: FX never delay an intent)', () => {
    const order: string[] = [];
    const handlers = makeHandlers();
    handlers.onDraw.mockImplementation(() => { order.push('send'); });
    const onSent = vi.fn<NonNullable<ArenaCommitHooks['onSent']>>(() => { order.push('fx'); });
    const commit = createArenaCommit(handlers, { onSent });
    commit({ kind: 'drawCard' });
    const context = { instanceId: 'card-1', dropPoint: { x: 5, y: 6 } };
    commit({ kind: 'sellCard', payload: { instanceId: 'card-1' } }, context);
    expect(order).toEqual(['send', 'fx', 'fx']);
    expect(onSent.mock.calls).toStrictEqual([[{ kind: 'drawCard' }, {}], [{ kind: 'sellCard', payload: { instanceId: 'card-1' } }, context]]);
  });

  it('sends nothing and fires no onSent when allow says no', () => {
    const handlers = makeHandlers();
    const onSent = vi.fn<NonNullable<ArenaCommitHooks['onSent']>>();
    const commit = createArenaCommit(handlers, { allow: (intent) => intent.kind !== 'drawCard', onSent });
    commit({ kind: 'drawCard' });
    expect([handlers.onDraw.mock.calls.length, onSent.mock.calls.length]).toEqual([0, 0]);
    commit({ kind: 'clearSpy', payload: { targetPlayerId: 'p2' } });
    expect(handlers.onClearSpy.mock.calls).toStrictEqual([['p2']]);
  });
});

describe('createArenaCommit result (L74 Part 2 final review, L74-25 M1)', () => {
  it('returns false on a veto and calls no handler and no onSent; true once the intent went out', () => {
    const handlers = makeHandlers();
    const onSent = vi.fn<NonNullable<ArenaCommitHooks['onSent']>>();
    let allowed = false;
    const commit = createArenaCommit(handlers, { allow: () => allowed, onSent });
    expect(commit({ kind: 'drawCard' })).toBe(false);
    expect(commit({ kind: 'playCard', payload: { instanceId: 'card-1' } }, { instanceId: 'card-1' })).toBe(false);
    for (const name of NAMES) expect(handlers[name]).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
    allowed = true;
    expect(commit({ kind: 'drawCard' })).toBe(true);
    expect([handlers.onDraw.mock.calls.length, onSent.mock.calls.length]).toEqual([1, 1]);
  });

  it('returns false and fires no onSent when the optional handler is absent', () => {
    const all = makeHandlers();
    const onSent = vi.fn<NonNullable<ArenaCommitHooks['onSent']>>();
    const commit = createArenaCommit(requiredOf(all), { onSent });
    expect(commit({ kind: 'deactivatePersistent', payload: { effectId: 'eff-1' } })).toBe(false);
    expect(commit({ kind: 'activateDuplication' })).toBe(false);
    expect(onSent).not.toHaveBeenCalled();
    expect(commit({ kind: 'buyPoolCard' })).toBe(true);
  });
});
