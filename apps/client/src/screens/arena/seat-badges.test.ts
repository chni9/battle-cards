/** Seat badge words: spec v7 §6.2, §11 (Q47); V2 flow-status and Draw words reused (L74-04). */
import { describe, expect, it } from 'vitest';

import type { SeatBadge } from '../../view-model/seats';
import { makePersistent } from '../../view-model/test-fixtures';
import { seatBadgeView, type SeatBadgeView } from './seat-badges';

const SENTENCE = { id: 's1', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false };

describe('seatBadgeView (§6.2)', () => {
  it.each<[string, SeatBadge, SeatBadgeView]>([
    ['the eye', { kind: 'spying-on-you' }, { icon: 'spying-on-you', label: 'Spying on you', value: null }],
    ['a Block chain', { kind: 'block', turnsRemaining: 2 }, { icon: 'block', label: 'Block · 2 left', value: '2' }],
    ['the last Block turn', { kind: 'block', turnsRemaining: 0 }, { icon: 'block', label: 'Block · attacks banned', value: null }],
    ['Invisibility', { kind: 'invisibility', effect: makePersistent({ id: 'i1', cardId: 'invisibility', counter: 3 }) },
      { icon: 'invisibility', label: 'Invisibility, 3 turns remaining', value: '3' }],
    ['a ticking Sentence', { kind: 'sentence', sentence: SENTENCE }, { icon: 'sentence-ticking', label: 'Sentence, 2 turns remaining', value: '2' }],
    ['an upgraded Shield', { kind: 'shield', isUpgraded: true }, { icon: 'shield-active', label: 'Shield upgraded', value: null }],
    ['Poison', { kind: 'persistent', effect: makePersistent({ id: 'x1', cardId: 'poison', counter: 3 }) },
      { icon: 'persistent', label: 'Poison, 3 card lives', value: '3' }],
    ['a Curse (no counter)', { kind: 'persistent', effect: makePersistent({ id: 'x2', cardId: 'curse' }) },
      { icon: 'persistent', label: 'Curse', value: null }],
    ['Duplication', { kind: 'duplication' }, { icon: 'duplication-active', label: 'Duplication active', value: null }],
    ['a Gambler draw gain (Q47)', { kind: 'draw-gain', amount: 37 }, { icon: 'draw', label: 'Draw, plus 37 pts', value: '+37' }],
    ['a pending Reanimation', { kind: 'reanimation', isUpgraded: false }, { icon: 'reanimation-armed', label: 'Reanimating', value: null }],
    ['the Absorber window', { kind: 'absorb-window' }, { icon: 'absorb-window', label: 'Absorber window', value: null }],
  ])('%s', (_name, badge, expected) => {
    expect(seatBadgeView(badge)).toEqual(expected);
  });
});
