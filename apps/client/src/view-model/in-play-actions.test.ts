import type { PendingSentenceView, PersistentEffectView, PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { cardActions, inPlayThumbs, type CardActionKind, type CardRef } from './card-actions';
import { makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const ON_TURN: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: ActionContext = { subChoice: { kind: 'mirror', eligibleEffectIds: ['fx-1'], deadlineMs: 0 }, readOnly: false };
const POISON = makePersistent({ id: 'pe-poison', cardId: 'poison', counter: 3 });
const CURSE = makePersistent({ id: 'pe-curse', cardId: 'curse' });
const INVISIBILITY = makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 2 });
const P1_POISON = makePersistent({ id: 'pe-p1-poison', cardId: 'poison', counter: 4 });
const OWN_SENTENCE: PendingSentenceView = { id: 'sentence:4:me:0', sourcePlayerId: 'me', remainingOwnerTurns: 3, isUpgraded: false };
const P1_SENTENCE: PendingSentenceView = { id: 'sentence:5:p1:0', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false };
const UPGRADE_ON = { kind: 'upgrade', enabled: true, reason: null } as const;
const DEACTIVATE_ON = { kind: 'deactivate', enabled: true, reason: null } as const;

/** Four own slots (Shield, Poison, Curse on me, Sentence; rules spec "Active slots") and p1's Shield, Poison, Sentence. */
function board(upgradePoints: number, actives: readonly PersistentEffectView[] = [POISON, CURSE], overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makePlayingView({
    players: [
      makePlayer('me', { isYou: true, activeShield: { isUpgraded: false }, activePersistentEffects: actives }),
      makePlayer('p1', { activeShield: { isUpgraded: false }, activePersistentEffects: [P1_POISON] }),
      makePlayer('p2'),
    ],
    self: makeSelf({ upgradePoints, shield: 4, activePersistentEffects: actives }),
    pendingSentences: [OWN_SENTENCE, P1_SENTENCE],
    ...overrides,
  });
}
const active = (ownerPlayerId: string, effect: PersistentEffectView): CardRef => ({ zone: 'active', ownerPlayerId, effect });
const shield = (ownerPlayerId: string, isUpgraded = false): CardRef => ({ zone: 'shield', ownerPlayerId, isUpgraded });
const sentence = (entry: PendingSentenceView, ownerPlayerId = entry.sourcePlayerId): CardRef => ({ zone: 'sentence', ownerPlayerId, sentence: entry });
const actionsOf = (view: PlayingStateView, ref: CardRef, ctx = ON_TURN) => cardActions(view, ref, ctx).actions;
const kindsOf = (view: PlayingStateView, ref: CardRef): CardActionKind[] => actionsOf(view, ref).map((action) => action.kind);

describe('cardActions: own-only Upgrade in play (Q37)', () => {
  it("offers no Upgrade on an opponent's base Shield, even with an own base Shield and 1 upgrade point", () => {
    const opponent = cardActions(board(1), shield('p1'), ON_TURN);
    expect(opponent.actions).toEqual([]);
    expect(opponent.instanceId).toBe('active-shield:p1');
    const own = cardActions(board(1), shield('me'), ON_TURN);
    expect(own.actions).toEqual([UPGRADE_ON]);
    expect(own.instanceId).toBe('active-shield');
  });

  it.each<[string, CardRef, string]>([
    ['own Poison', active('me', POISON), 'pe-poison'],
    ['own Shield', shield('me'), 'active-shield'],
    ['own Sentence', sentence(OWN_SENTENCE), 'sentence:4:me:0'],
  ])('%s offers Upgrade at 1 upgrade point and shows it disabled at 0', (_label, ref, instanceId) => {
    const withPoint = cardActions(board(1), ref, ON_TURN);
    expect(withPoint.instanceId).toBe(instanceId);
    expect(withPoint.actions.find((action) => action.kind === 'upgrade')).toEqual(UPGRADE_ON);
    const withoutPoint = cardActions(board(0), ref, ON_TURN);
    expect(withoutPoint.instanceId).toBe(instanceId);
    expect(withoutPoint.actions.find((action) => action.kind === 'upgrade')).toEqual({ kind: 'upgrade', enabled: false, reason: 'no-upgrade-point' });
  });

  it("gives an opponent's Poison and Sentence a read-only sheet", () => {
    expect(actionsOf(board(1), active('p1', P1_POISON))).toEqual([]);
    expect(actionsOf(board(1), sentence(P1_SENTENCE))).toEqual([]);
  });

  it('hides Upgrade on Curse, Reanimation and anything already upgraded, at exactly 1 upgrade point', () => {
    const reanimation = makePersistent({ id: 'pe-rean', cardId: 'reanimation' });
    const upgradedPoison = makePersistent({ id: 'pe-poison-up', cardId: 'poison', isUpgraded: true, counter: 3 });
    const upgradedSentence = { ...OWN_SENTENCE, isUpgraded: true };
    const actives = [CURSE, reanimation, upgradedPoison];
    const view = board(1, actives, {
      self: makeSelf({ upgradePoints: 1, shield: 4, shieldIsUpgraded: true, activePersistentEffects: actives }),
      pendingSentences: [upgradedSentence],
    });
    for (const effect of actives) {
      expect(actionsOf(view, active('me', effect))).toEqual([DEACTIVATE_ON]);
    }
    expect(actionsOf(view, shield('me', true))).toEqual([]);
    expect(actionsOf(view, sentence(upgradedSentence))).toEqual([]);
  });

  it('upgrades own Invisibility: Upgrade is not pacifist-locked', () => {
    expect(actionsOf(board(1, [INVISIBILITY]), active('me', INVISIBILITY))).toEqual([UPGRADE_ON, DEACTIVATE_ON]);
  });

  it('follows the server on ownership (upgrade-card.ts finds by id)', () => {
    const noShield = board(1, [POISON], { self: makeSelf({ upgradePoints: 1, shield: 0, activePersistentEffects: [POISON] }) });
    expect(actionsOf(noShield, shield('me'))).toEqual([]);
    expect(actionsOf(board(1), sentence(P1_SENTENCE, 'me'))).toEqual([]);
    expect(actionsOf(board(1), active('me', P1_POISON))).toEqual([]);
    expect(actionsOf(board(1, [POISON], { isSpectator: true }), shield('me'))).toEqual([]);
  });

  it("follows the view's own record, not the ref, on an own card's upgraded state (Decision 2)", () => {
    const upgradedPoison = { ...POISON, isUpgraded: true };
    const upgradedSentence = { ...OWN_SENTENCE, isUpgraded: true };
    // The ref says upgraded, the view's own record says base: Upgrade stays offered.
    expect(actionsOf(board(1), shield('me', true))).toEqual([UPGRADE_ON]);
    expect(actionsOf(board(1), active('me', upgradedPoison))).toEqual([UPGRADE_ON, DEACTIVATE_ON]);
    expect(actionsOf(board(1), sentence(upgradedSentence))).toEqual([UPGRADE_ON]);
    // The ref says base, the view's own record says upgraded: Upgrade stays hidden.
    const upgradedRecords = board(1, [upgradedPoison], {
      self: makeSelf({ upgradePoints: 1, shield: 4, shieldIsUpgraded: true, activePersistentEffects: [upgradedPoison] }),
      pendingSentences: [upgradedSentence],
    });
    expect(actionsOf(upgradedRecords, shield('me'))).toEqual([]);
    expect(actionsOf(upgradedRecords, active('me', POISON))).toEqual([DEACTIVATE_ON]);
    expect(actionsOf(upgradedRecords, sentence(OWN_SENTENCE))).toEqual([]);
  });

  it.each<[string, CardRef]>([
    ['own Shield', shield('me')],
    ['own Sentence', sentence(OWN_SENTENCE)],
  ])('%s shows Upgrade disabled off-turn and while a sub-choice is open', (_label, ref) => {
    expect(actionsOf(board(1, [POISON, CURSE], { currentTurnPlayerId: 'p1' }), ref)).toEqual([
      { kind: 'upgrade', enabled: false, reason: 'not-your-turn' },
    ]);
    expect(actionsOf(board(1), ref, MIRROR_OPEN)).toEqual([
      { kind: 'upgrade', enabled: false, reason: 'actions-locked' },
    ]);
  });

  it('never offers Use, Sell or Multi-attack on a card in play', () => {
    const model = cardActions(board(1), active('me', POISON), ON_TURN);
    expect(model.use).toBeNull();
    expect(model.multiAttack).toBeNull();
    expect(model.actions.map((action) => action.kind)).toEqual(['upgrade', 'deactivate']);
  });
});

describe('cardActions: Deactivate (Lot 69; Q40)', () => {
  it('is absent on Shield and Sentence', () => {
    expect(kindsOf(board(1), shield('me'))).toEqual(['upgrade']);
    expect(kindsOf(board(1), sentence(OWN_SENTENCE))).toEqual(['upgrade']);
  });

  it('is offered on own persistents, a Curse on you included', () => {
    expect(actionsOf(board(0), active('me', CURSE))).toEqual([DEACTIVATE_ON]);
    expect(actionsOf(board(0), active('me', POISON))).toEqual([{ kind: 'upgrade', enabled: false, reason: 'no-upgrade-point' }, DEACTIVATE_ON]);
  });

  it('is disabled off-turn and while a sub-choice is open', () => {
    expect(actionsOf(board(1, [POISON], { currentTurnPlayerId: 'p1' }), active('me', POISON))).toEqual([
      { kind: 'upgrade', enabled: false, reason: 'not-your-turn' },
      { kind: 'deactivate', enabled: false, reason: 'not-your-turn' },
    ]);
    expect(actionsOf(board(1), active('me', POISON), MIRROR_OPEN)).toEqual([
      { kind: 'upgrade', enabled: false, reason: 'actions-locked' },
      { kind: 'deactivate', enabled: false, reason: 'actions-locked' },
    ]);
  });

  it('is locked on the finished board', () => {
    expect(actionsOf(board(1), active('me', CURSE), { subChoice: null, readOnly: true })).toEqual([
      { kind: 'deactivate', enabled: false, reason: 'actions-locked' },
    ]);
  });
});

describe('inPlayThumbs (Appendix A active-persistent-thumbs, sentence-chips, global-activated-art-guard)', () => {
  it('lists own Shield, persistents and ticking Sentences in order, with their badges', () => {
    expect(inPlayThumbs(board(1), 'me')).toEqual([
      { ref: shield('me'), instance: { instanceId: 'active-shield', cardId: 'shield', isUpgraded: false }, badge: null, activatedArt: false },
      { ref: active('me', POISON), instance: { instanceId: 'pe-poison', cardId: 'poison', isUpgraded: false }, badge: { kind: 'card-lives', value: 3 }, activatedArt: true },
      { ref: active('me', CURSE), instance: { instanceId: 'pe-curse', cardId: 'curse', isUpgraded: false }, badge: null, activatedArt: true },
      { ref: sentence(OWN_SENTENCE), instance: { instanceId: 'sentence:4:me:0', cardId: 'sentence', isUpgraded: false }, badge: { kind: 'sentence-turns', value: 3 }, activatedArt: false },
    ]);
    const upgradedShield = board(1, [POISON, CURSE], {
      self: makeSelf({ upgradePoints: 1, shield: 4, shieldIsUpgraded: true, activePersistentEffects: [POISON, CURSE] }),
    });
    expect(inPlayThumbs(upgradedShield, 'me')[0]).toMatchObject({
      ref: shield('me', true),
      instance: { instanceId: 'active-shield', cardId: 'shield', isUpgraded: true },
    });
  });

  it("lists another seat's Shield under its per-seat id, then its persistents and Sentences", () => {
    expect(inPlayThumbs(board(1), 'p1')).toEqual([
      { ref: shield('p1'), instance: { instanceId: 'active-shield:p1', cardId: 'shield', isUpgraded: false }, badge: null, activatedArt: false },
      { ref: active('p1', P1_POISON), instance: { instanceId: 'pe-p1-poison', cardId: 'poison', isUpgraded: false }, badge: { kind: 'card-lives', value: 4 }, activatedArt: true },
      { ref: sentence(P1_SENTENCE), instance: { instanceId: 'sentence:5:p1:0', cardId: 'sentence', isUpgraded: false }, badge: { kind: 'sentence-turns', value: 2 }, activatedArt: false },
    ]);
    expect(inPlayThumbs(board(1), 'p2')).toEqual([]);
  });

  it('badges Invisibility with turns and drops the Shield thumb at 0 shield', () => {
    const view = board(0, [INVISIBILITY], { self: makeSelf({ shield: 0, activePersistentEffects: [INVISIBILITY] }), pendingSentences: [] });
    expect(inPlayThumbs(view, 'me')).toEqual([
      { ref: active('me', INVISIBILITY), instance: { instanceId: 'pe-inv', cardId: 'invisibility', isUpgraded: false }, badge: { kind: 'turns', value: 2 }, activatedArt: true },
    ]);
  });

  it('never requests activated art for Shield or Sentence, and its refs resolve to the intent ids', () => {
    const thumbs = [...inPlayThumbs(board(1), 'me'), ...inPlayThumbs(board(1), 'p1')];
    expect(thumbs.filter((thumb) => thumb.ref.zone !== 'active').map((thumb) => thumb.activatedArt)).toEqual([false, false, false, false]);
    expect(inPlayThumbs(board(1), 'me').map((thumb) => cardActions(board(1), thumb.ref, ON_TURN).instanceId)).toEqual([
      'active-shield', 'pe-poison', 'pe-curse', 'sentence:4:me:0',
    ]);
  });
});
