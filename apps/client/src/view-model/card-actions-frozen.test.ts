import { describe, expect, it, vi } from 'vitest';

import { cardActions, type CardRef } from './card-actions';
import { makeCard, makePersistent, makePlayingView, makeSelf } from './test-fixtures';

// card.ts TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS is empty today (L56-02 / L58-06 switch).
vi.mock('@card-battle/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@card-battle/shared')>();
  return { ...actual, isTemporarilyUnavailableCardId: (cardId: string) => cardId === 'cloning' };
});

const CLONING: CardRef = { zone: 'special', instance: makeCard('cloning') };

describe('cardActions on a frozen special (L56-02 / L58-06 switch)', () => {
  it('keeps Use on a frozen special, disabled as temporarily-unavailable; Upgrade stays usable', () => {
    const view = makePlayingView({ self: makeSelf({ points: 3, upgradePoints: 1 }) });
    expect(cardActions(view, CLONING, { subChoice: null, readOnly: false }).actions).toEqual([
      { kind: 'use', enabled: false, reason: 'temporarily-unavailable' },
      { kind: 'upgrade', enabled: true, reason: null },
    ]);
  });
  it('reports temporarily-unavailable before Invisibility, and the lock before both', () => {
    const self = makeSelf({ points: 3, activePersistentEffects: [makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 3 })] });
    const use = (ctx: { subChoice: null; readOnly: boolean }) => cardActions(makePlayingView({ self }), CLONING, ctx).actions[0]?.reason;
    expect(use({ subChoice: null, readOnly: false })).toBe('temporarily-unavailable');
    expect(use({ subChoice: null, readOnly: true })).toBe('actions-locked');
  });
});
