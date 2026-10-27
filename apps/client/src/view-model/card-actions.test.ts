import type { CardId, PendingEffectView, PlayingStateView, PrivateSelfView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import type { DisabledReason } from './action-reasons';
import { cardActions, type CardActionKind, type CardActionsModel, type CardRef, type UseRouting } from './card-actions';
import { makeCard, makePending, makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const ON_TURN: ActionContext = { subChoice: null, readOnly: false };
const OPEN_MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['fx-1'], deadlineMs: 0 };
const INVISIBLE = makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 3 });
const hand = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'hand', instance: makeCard(cardId, { isUpgraded }) });
const special = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'special', instance: makeCard(cardId, { isUpgraded }) });
const kinds = (model: CardActionsModel): CardActionKind[] => model.actions.map((action) => action.kind);
/** `undefined` = absent, `null` = enabled, else its reason. */
const reasonOf = (model: CardActionsModel, kind: CardActionKind): DisabledReason | null | undefined =>
  model.actions.find((action) => action.kind === kind)?.reason;
const viewWith = (self: Partial<PrivateSelfView>, overrides: Partial<PlayingStateView> = {}): PlayingStateView =>
  makePlayingView({ self: makeSelf(self), ...overrides });
const reasonOfUse = (view: PlayingStateView, ref: CardRef, ctx: ActionContext = ON_TURN) => reasonOf(cardActions(view, ref, ctx), 'use');
const tiles = (model: CardActionsModel) => (model.use?.kind === 'regeneration' ? model.use.tiles : null);
const BANNED = [makePlayer('me', { isYou: true, blockAttacksForbidden: true }), makePlayer('p1'), makePlayer('p2')];
const ALL_INVISIBLE = [makePlayer('me', { isYou: true }), makePlayer('p1', { activePersistentEffects: [INVISIBLE] }), makePlayer('p2', { activePersistentEffects: [INVISIBLE] })];

/** Living p1; living Invisible p2 (attack on me); corpses c1 (attack on me), c2 (Thief on me),
 *  c3 (absorb window, leftover Invisibility), c4 (attacks p1; my own attack sits on it). */
function crowdedTable(): PlayingStateView {
  return viewWith({ points: 30, upgradePoints: 1 }, {
    turnOrder: ['me', 'p1', 'p2', 'c1', 'c2', 'c3', 'c4'],
    players: [
      makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2', { activePersistentEffects: [INVISIBLE] }),
      makePlayer('c1', { isEliminated: true }), makePlayer('c2', { isEliminated: true }),
      makePlayer('c3', { isEliminated: true, absorbWindowOpen: true, activePersistentEffects: [INVISIBLE] }),
      makePlayer('c4', { isEliminated: true }),
    ],
    pendingEffects: [
      makePending({ id: 'fx-c1', sourcePlayerId: 'c1', targetPlayerId: 'me', cardId: 'strong-attack' }),
      makePending({ id: 'fx-c2', sourcePlayerId: 'c2', targetPlayerId: 'me', cardId: 'thief' }),
      makePending({ id: 'fx-c4', sourcePlayerId: 'c4', targetPlayerId: 'p1', cardId: 'basic-attack' }),
      makePending({ id: 'fx-me', sourcePlayerId: 'me', targetPlayerId: 'c4', cardId: 'basic-attack' }),
      makePending({ id: 'fx-p2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'basic-attack' }),
    ],
  });
}

/** The target seat ids, failing the test when Use is not routed to a target pick. */
function targetSeats(model: CardActionsModel): readonly string[] {
  expect(model.use?.kind).toBe('target');
  return model.use?.kind === 'target' ? model.use.seatIds : [];
}

describe('cardActions: hand and special actions (spec v7 §6.6.1, Appendix A card-actions-dialog)', () => {
  it('offers Use, Upgrade and Sell on a base hand card, in display order', () => {
    const model = cardActions(viewWith({ points: 1, upgradePoints: 1 }), hand('basic-attack'), ON_TURN);
    expect(model.instanceId).toBe('basic-attack-1');
    expect(model.actions).toEqual([
      { kind: 'use', enabled: true, reason: null },
      { kind: 'upgrade', enabled: true, reason: null },
      { kind: 'sell', enabled: true, reason: null },
    ]);
    expect(model.multiAttack).toBeNull();
  });

  it('hides Sell on a special', () => {
    expect(kinds(cardActions(viewWith({ points: 3, upgradePoints: 1 }), special('cloning'), ON_TURN))).toEqual(['use', 'upgrade']);
  });

  it('hides Upgrade once the copy is upgraded', () => {
    expect(kinds(cardActions(viewWith({ points: 2, upgradePoints: 1 }), hand('strong-attack', true), ON_TURN))).toEqual(['use', 'sell']);
  });

  it('keys Upgrade on the copy, not the kit trait', () => {
    const view = viewWith({ kitId: 'scientific', points: 2, upgradePoints: 1 });
    expect(reasonOf(cardActions(view, hand('spy'), ON_TURN), 'upgrade')).toBeNull();
    expect(reasonOf(cardActions(view, hand('spy', true), ON_TURN), 'upgrade')).toBeUndefined();
  });

  it('disables Upgrade at 0 upgrade points', () => {
    expect(reasonOf(cardActions(viewWith({ points: 1 }), hand('basic-attack'), ON_TURN), 'upgrade')).toBe('no-upgrade-point');
  });

  it('keeps Upgrade and Sell usable under own Invisibility and the Block ban', () => {
    const view = viewWith({ points: 1, upgradePoints: 1, activePersistentEffects: [INVISIBLE] }, { players: BANNED });
    const model = cardActions(view, hand('basic-attack'), ON_TURN);
    expect(reasonOf(model, 'use')).toBe('invisibility');
    expect(reasonOf(model, 'upgrade')).toBeNull();
    expect(reasonOf(model, 'sell')).toBeNull();
  });

  it('gives a read-only card no actions and no routing', () => {
    const model = cardActions(crowdedTable(), { zone: 'read-only', instance: makeCard('thief') }, ON_TURN);
    expect(model.instanceId).toBe('thief-1');
    expect(model.actions).toEqual([]);
    expect(model.use).toBeNull();
    expect(model.multiAttack).toBeNull();
  });
});

describe('target seats per card family (Appendix A table-target-picker-eligibility)', () => {
  it.each<[string, CardRef, readonly string[]]>([
    ['Basic attack', hand('basic-attack'), ['p1', 'c1']], ['Strong attack', hand('strong-attack'), ['p1', 'c1']],
    ['Super attack+', hand('super-attack', true), ['p1', 'c1']], ['Thief', hand('thief'), ['p1', 'c2']],
    ['Thief+', hand('thief', true), ['p1', 'c2']], ['Absorber', hand('absorber'), ['p1', 'c3']],
  ])('%s targets %j', (_label, ref, seatIds) => {
    expect(cardActions(crowdedTable(), ref, ON_TURN).use).toEqual({ kind: 'target', seatIds });
  });

  it.each<[string, CardRef]>([
    ['Spy', hand('spy')], ['Spy+', hand('spy', true)], ['Cloning', special('cloning')], ['Curse', special('curse')],
    ['Card Thief', special('card-thief')], ['Upgrade Point Thief', special('upgrade-point-thief')],
    ['Spy Thief', special('spy-thief')],
  ])('%s targets living non-Invisible seats only', (_label, ref) => {
    expect(cardActions(crowdedTable(), ref, ON_TURN).use).toEqual({ kind: 'target', seatIds: ['p1'] });
  });

  it('keeps attack and Thief corpse ripostes separate and never offers a living Invisible seat (L68-07, L65-02)', () => {
    const table = crowdedTable();
    expect(targetSeats(cardActions(table, hand('basic-attack'), ON_TURN))).not.toContain('c2');
    expect(targetSeats(cardActions(table, hand('thief'), ON_TURN))).not.toContain('c1');
    for (const ref of [hand('basic-attack'), hand('thief'), hand('absorber'), hand('spy'), special('curse')]) {
      const seatIds = targetSeats(cardActions(table, ref, ON_TURN));
      expect(seatIds).not.toContain('p2');
      expect(seatIds).not.toContain('me');
    }
  });

  it.each(['card-thief', 'upgrade-point-thief', 'spy-thief'] as const)('upgraded %s takes no target', (cardId) => {
    const model = cardActions(crowdedTable(), special(cardId, true), ON_TURN);
    expect(model.use).toEqual({ kind: 'send' });
    expect(reasonOf(model, 'use')).toBeNull();
  });

  it('keeps an Untouchable seat as a Spy and Thief target: no client immunity filter', () => {
    const view = viewWith({ points: 30 }, {
      players: [makePlayer('me', { isYou: true }), makePlayer('p1', { spied: { kitId: 'untouchable', hand: [], specialCards: [] } }), makePlayer('p2')],
    });
    expect(cardActions(view, hand('spy'), ON_TURN).use).toEqual({ kind: 'target', seatIds: ['p1', 'p2'] });
    expect(cardActions(view, hand('thief'), ON_TURN).use).toEqual({ kind: 'target', seatIds: ['p1', 'p2'] });
  });

  it.each<[string, CardRef]>([
    ['MEGA ATTACK', special('mega-attack')], ['Poison', special('poison')], ['Imposition', special('imposition')],
    ['Sentence', special('sentence')], ['Suicide', special('suicide')], ['Mirror', hand('mirror')],
    ['Super Mirror', special('super-mirror')], ['Tax', hand('tax')], ['Shield', hand('shield')],
    ['Block', special('block')], ['Invisibility', special('invisibility')], ['Attack Thief', special('attack-thief')],
  ])('%s sends at once with no target', (_label, ref) => {
    const model = cardActions(crowdedTable(), ref, ON_TURN);
    expect(model.use).toEqual({ kind: 'send' });
    expect(reasonOf(model, 'use')).toBeNull();
  });

  it.each<[string, CardRef, UseRouting['kind'], DisabledReason | null]>([
    ['Spy', hand('spy'), 'target', 'no-valid-target'], ['Basic attack', hand('basic-attack'), 'target', 'no-valid-target'],
    ['Upgrade Point Thief+', special('upgrade-point-thief', true), 'send', 'no-valid-target'],
    ['Spy Thief+', special('spy-thief', true), 'send', 'no-valid-target'], ['Sentence+', special('sentence', true), 'send', 'no-valid-target'],
    ['Card Thief+', special('card-thief', true), 'send', null], ['Sentence', special('sentence'), 'send', null],
    ['MEGA ATTACK', special('mega-attack'), 'send', null],
  ])('with every living opponent Invisible, %s routes %s with reason %s', (_label, ref, kind, reason) => {
    const model = cardActions(viewWith({ points: 30 }, { players: ALL_INVISIBLE }), ref, ON_TURN);
    expect(model.use?.kind).toBe(kind);
    expect(reasonOf(model, 'use')).toBe(reason);
  });

  it('shows an empty seat set, not a fallback, when every living opponent is Invisible', () => {
    expect(cardActions(viewWith({ points: 30 }, { players: ALL_INVISIBLE }), hand('spy'), ON_TURN).use).toEqual({
      kind: 'target',
      seatIds: [],
    });
  });
});

describe('Use routing: pre-send choices (Appendix A regeneration-quantity-picker, card-transformer-consume-picker)', () => {
  it('prices Regeneration tiles at 3 points a life and disables those past the points', () => {
    const model = cardActions(viewWith({ points: 7 }), hand('regeneration'), ON_TURN);
    expect(reasonOf(model, 'use')).toBeNull();
    expect(tiles(model)).toEqual([
      { quantity: 1, label: '1 life', totalCost: 3, enabled: true, reason: null },
      { quantity: 2, label: '2 lives', totalCost: 6, enabled: true, reason: null },
      { quantity: 3, label: '3 lives', totalCost: 9, enabled: false, reason: 'not-enough-points' },
      { quantity: 4, label: '4 lives', totalCost: 12, enabled: false, reason: 'not-enough-points' },
    ]);
  });

  it('prices upgraded Regeneration tiles at 2 points a life', () => {
    const model = cardActions(viewWith({ points: 7 }), hand('regeneration', true), ON_TURN);
    expect(tiles(model)?.map((tile) => [tile.totalCost, tile.enabled])).toEqual([[2, true], [4, true], [6, true], [8, false]]);
  });

  it('disables Use and every tile on Regeneration below one life of points', () => {
    const model = cardActions(viewWith({ points: 2 }), hand('regeneration'), ON_TURN);
    expect(reasonOf(model, 'use')).toBe('not-enough-points');
    expect(tiles(model)?.map((tile) => tile.reason)).toEqual(['not-enough-points', 'not-enough-points', 'not-enough-points', 'not-enough-points']);
  });

  it('offers Card Transformer the shared hand cards to consume', () => {
    const model = cardActions(viewWith({ points: 2, hand: [makeCard('basic-attack'), makeCard('spy')] }), special('card-transformer'), ON_TURN);
    expect(model.use).toEqual({ kind: 'consume', options: [makeCard('basic-attack'), makeCard('spy')] });
    expect(reasonOf(model, 'use')).toBeNull();
  });

  it('gives Card Transformer with no shared card nothing-to-consume, before the points check', () => {
    expect(reasonOfUse(viewWith({ points: 2 }), special('card-transformer'))).toBe('nothing-to-consume');
    expect(reasonOfUse(viewWith({ points: 0 }), special('card-transformer'))).toBe('nothing-to-consume');
    expect(reasonOfUse(viewWith({ points: 1, hand: [makeCard('spy')] }), special('card-transformer'))).toBe('not-enough-points');
  });
});

describe('disabled reasons, one fixture each (spec v7 §11)', () => {
  it('disables every action off-turn with not-your-turn', () => {
    const view = viewWith(
      { kitId: 'assassin', points: 20, upgradePoints: 1, hand: [makeCard('basic-attack'), makeCard('strong-attack')] },
      { currentTurnPlayerId: 'p1' },
    );
    expect(cardActions(view, hand('basic-attack'), ON_TURN).actions).toEqual([
      { kind: 'use', enabled: false, reason: 'not-your-turn' },
      { kind: 'upgrade', enabled: false, reason: 'not-your-turn' },
      { kind: 'sell', enabled: false, reason: 'not-your-turn' },
      { kind: 'multi-attack', enabled: false, reason: 'not-your-turn' },
    ]);
    expect(cardActions(view, special('cloning'), ON_TURN).actions.map((action) => action.reason)).toEqual(['not-your-turn', 'not-your-turn']);
    expect(tiles(cardActions(view, hand('regeneration'), ON_TURN))?.map((tile) => tile.reason)).toEqual([
      'not-your-turn', 'not-your-turn', 'not-your-turn', 'not-your-turn',
    ]);
  });

  it.each<[string, Partial<PlayingStateView>, ActionContext]>([
    ['on the finished board', {}, { subChoice: null, readOnly: true }],
    ['while a sub-choice is open', {}, { subChoice: OPEN_MIRROR, readOnly: false }],
    ['for an eliminated POV', { players: [makePlayer('me', { isYou: true, isEliminated: true }), makePlayer('p1'), makePlayer('p2')] }, ON_TURN],
    ['for a walk-in spectator', { isSpectator: true }, ON_TURN],
  ])('locks every action %s', (_label, overrides, ctx) => {
    expect(cardActions(viewWith({ points: 20, upgradePoints: 1 }, overrides), hand('basic-attack'), ctx).actions.map((a) => a.reason)).toEqual([
      'actions-locked', 'actions-locked', 'actions-locked',
    ]);
  });

  it('disables cards that act on other players under own Invisibility (L58-06, cardActsOnOpponents)', () => {
    const view = viewWith({ points: 30, activePersistentEffects: [INVISIBLE] }, { pool: [makeCard('spy')] });
    for (const ref of [hand('basic-attack'), special('mega-attack'), hand('spy'), hand('mirror'), special('suicide'), special('sentence')]) {
      expect(reasonOfUse(view, ref)).toBe('invisibility');
    }
    for (const ref of [hand('shield'), hand('tax'), special('block'), special('attack-thief'), special('card-absorber'), special('super-regeneration')]) {
      expect(reasonOfUse(view, ref)).toBeNull();
    }
  });

  it('disables attacks and Block during the Block ban', () => {
    const view = viewWith({ points: 30 }, { players: BANNED });
    for (const ref of [hand('strong-attack'), special('mega-attack'), special('block')]) {
      expect(reasonOfUse(view, ref)).toBe('attack-ban');
    }
    expect(reasonOfUse(view, hand('tax'))).toBeNull();
    expect(reasonOfUse(view, hand('thief'))).toBeNull();
  });

  it('reports the first reason in the server order (perform-action.ts playCardAction)', () => {
    const invisibleAndBanned = viewWith({ points: 30, activePersistentEffects: [INVISIBLE] }, { players: BANNED });
    expect(reasonOfUse(invisibleAndBanned, hand('basic-attack'))).toBe('invisibility');
    expect(reasonOfUse(invisibleAndBanned, hand('basic-attack'), { subChoice: null, readOnly: true })).toBe('actions-locked');
    expect(reasonOfUse(viewWith({ points: 0 }, { players: BANNED }), hand('basic-attack'))).toBe('attack-ban');
    expect(reasonOfUse(viewWith({ points: 0 }, { players: ALL_INVISIBLE }), hand('spy'))).toBe('no-valid-target');
  });

  it('disables an unaffordable play with not-enough-points', () => {
    expect(reasonOfUse(viewWith({ points: 1 }), hand('strong-attack'))).toBe('not-enough-points');
    expect(reasonOfUse(viewWith({ points: 2 }), hand('strong-attack'))).toBeNull();
    expect(reasonOfUse(viewWith({ points: 15 }), special('mega-attack'))).toBe('not-enough-points');
    expect(reasonOfUse(viewWith({ points: 16 }), special('mega-attack'))).toBeNull();
  });

  it('keeps Tax usable at 1 life (tax.ts canPlay ignores lives)', () => {
    expect(reasonOfUse(viewWith({ lives: 1 }), hand('tax'))).toBeNull();
  });

  const onMe = (cardId: CardId, extra: Partial<PendingEffectView> = {}): PendingEffectView =>
    makePending({ id: `fx-${cardId}`, sourcePlayerId: 'p1', targetPlayerId: 'me', cardId, ...extra });
  it.each<[string, PendingEffectView[], DisabledReason | null, DisabledReason | null, DisabledReason | null]>([
    ['nothing pending', [], 'no-valid-target', 'no-valid-target', 'no-valid-target'],
    ['a base attack on you', [onMe('basic-attack')], null, null, null],
    ['an upgraded attack on you', [onMe('basic-attack', { isUpgraded: true })], 'no-valid-target', null, null],
    ['a Super Mirror redirect on you', [onMe('basic-attack', { redirectedBy: 'super-mirror' })], 'no-valid-target', 'no-valid-target', null],
    ['a base MEGA ATTACK on you', [onMe('mega-attack')], 'no-valid-target', null, null],
    ['an upgraded MEGA ATTACK on you', [onMe('mega-attack', { isUpgraded: true })], 'no-valid-target', 'no-valid-target', null],
    ['a Thief on you', [onMe('thief')], 'no-valid-target', 'no-valid-target', 'no-valid-target'],
    ['an attack on p2', [makePending({ id: 'fx-x', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack' })], 'no-valid-target', 'no-valid-target', 'no-valid-target'],
  ])('Mirror / Mirror+ / Super Mirror with %s', (_label, pendingEffects, base, upgraded, superMirror) => {
    const view = viewWith({ points: 7 }, { pendingEffects });
    expect(reasonOfUse(view, hand('mirror'))).toBe(base);
    expect(reasonOfUse(view, hand('mirror', true))).toBe(upgraded);
    expect(reasonOfUse(view, special('super-mirror'))).toBe(superMirror);
  });

  it('disables Card Absorber on an empty pool', () => {
    expect(reasonOfUse(viewWith({ points: 4 }), special('card-absorber'))).toBe('pool-empty');
    expect(reasonOfUse(viewWith({ points: 4 }, { pool: [makeCard('spy')] }), special('card-absorber'))).toBeNull();
  });

  it('greys a second Reanimation while one is armed (reanimation.ts canPlay, designer 2026-10-27)', () => {
    const ARMED = makePersistent({ id: 'pe-rean', cardId: 'reanimation' });
    expect(reasonOfUse(viewWith({ points: 8 }), special('reanimation'))).toBeNull();
    expect(reasonOfUse(viewWith({ points: 8, activePersistentEffects: [ARMED] }), special('reanimation'))).toBe('reanimation-armed');
    expect(reasonOfUse(viewWith({ points: 0, activePersistentEffects: [ARMED] }), special('reanimation'))).toBe('reanimation-armed');
    expect(reasonOfUse(viewWith({ points: 8, activePersistentEffects: [ARMED] }, { currentTurnPlayerId: 'p1' }), special('reanimation'))).toBe('not-your-turn');
    const opponentArmed = viewWith({ points: 8 }, {
      players: [makePlayer('me', { isYou: true }), makePlayer('p1', { activePersistentEffects: [ARMED] }), makePlayer('p2')],
    });
    expect(reasonOfUse(opponentArmed, special('reanimation'))).toBeNull();
  });
});

describe('Multi-attack (Assassin; Q44; Appendix A assassin-multi-attack)', () => {
  const ATTACKS = [makeCard('basic-attack'), makeCard('strong-attack'), makeCard('spy')];
  const assassin = (self: Partial<PrivateSelfView> = {}, overrides: Partial<PlayingStateView> = {}) =>
    viewWith({ kitId: 'assassin', points: 3, hand: ATTACKS, ...self }, overrides);
  const multi = (view: PlayingStateView) => reasonOf(cardActions(view, hand('basic-attack'), ON_TURN), 'multi-attack');

  it('offers hand-attack rows with the attack seat set', () => {
    const view = { ...crowdedTable(), self: makeSelf({ kitId: 'assassin', points: 3, hand: ATTACKS, specialCards: [makeCard('mega-attack')] }) };
    const model = cardActions(view, hand('strong-attack'), ON_TURN);
    expect(kinds(model)).toEqual(['use', 'upgrade', 'sell', 'multi-attack']);
    expect(reasonOf(model, 'multi-attack')).toBeNull();
    expect(model.multiAttack).toEqual({
      minAttacks: 2,
      rows: [
        { instance: makeCard('basic-attack'), seatIds: ['p1', 'c1'] },
        { instance: makeCard('strong-attack'), seatIds: ['p1', 'c1'] },
      ],
    });
  });

  it('hides Multi-attack below two hand attacks, for other kits, on non-attacks and on MEGA ATTACK', () => {
    const oneAttack = cardActions(assassin({ hand: [makeCard('basic-attack'), makeCard('spy')] }), hand('basic-attack'), ON_TURN);
    expect(kinds(oneAttack)).not.toContain('multi-attack');
    expect(oneAttack.multiAttack).toBeNull();
    const hidden = [
      cardActions(assassin({ kitId: 'kamikaze' }), hand('basic-attack'), ON_TURN),
      cardActions(assassin(), hand('spy'), ON_TURN),
      cardActions(assassin({ points: 30, specialCards: [makeCard('mega-attack')] }), special('mega-attack'), ON_TURN),
    ];
    for (const model of hidden) {
      expect(kinds(model)).not.toContain('multi-attack');
      expect(model.multiAttack).toBeNull();
    }
  });

  it('uses the server reasons in its order (perform-action.ts:1536-1626)', () => {
    expect(multi(assassin({ activePersistentEffects: [INVISIBLE] }))).toBe('invisibility');
    expect(multi(assassin({}, { players: BANNED }))).toBe('attack-ban');
    expect(multi(assassin({ activePersistentEffects: [INVISIBLE] }, { players: BANNED }))).toBe('attack-ban');
    expect(multi(assassin({}, { players: ALL_INVISIBLE }))).toBe('no-valid-target');
    expect(multi(assassin({ points: 2 }))).toBe('not-enough-points');
    expect(multi(assassin({ points: 3 }))).toBeNull();
    expect(multi(assassin({ points: 10, hand: [makeCard('super-attack'), makeCard('basic-attack')] }))).toBe('not-enough-points');
  });
});
