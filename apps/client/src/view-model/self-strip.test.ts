/**
 * selfStrip() and the dock: technical spec v7 §6.1 items 3 and 5, §6.3, §6.12 and §11 (L73-09).
 */
import {
  CLEAR_SPY_COST,
  type PlayingStateView,
  type PublicPlayerView,
  type SubChoiceRequiredPayload,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { DISABLED_REASON_COPY, type DisabledReason } from './action-reasons';
import { cardActions } from './card-actions';
import { selfStrip } from './self-strip';
import { makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const FINISHED: ActionContext = { subChoice: null, readOnly: true };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };
const SUB_CHOICE: ActionContext = { subChoice: MIRROR_OPEN, readOnly: false };

function viewWith(
  pov: Partial<PublicPlayerView>,
  rest: Partial<PlayingStateView> = {},
  opponents: readonly PublicPlayerView[] = [makePlayer('p1'), makePlayer('p2')],
): PlayingStateView {
  return makePlayingView({ ...rest, players: [makePlayer('me', { isYou: true, ...pov }), ...opponents] });
}

const SPY_P1 = [makePlayer('p1', { spyingOnYou: true }), makePlayer('p2')];

function walkInView(): PlayingStateView {
  return makePlayingView({
    you: 'spec',
    isSpectator: true,
    currentTurnPlayerId: 'p1',
    turnOrder: ['p1', 'p2'],
    players: [makePlayer('p1'), makePlayer('p2')],
    self: makeSelf({ kitId: 'untouchable', lives: 0 }),
  });
}

describe('selfStrip resources and thumbs (§6.1 item 3)', () => {
  it('carries exact own resources, the kit and the seat colour', () => {
    const strip = selfStrip(
      makePlayingView({ self: makeSelf({ lives: 7, shield: 3, shieldIsUpgraded: true, points: 12, upgradePoints: 2 }) }),
      LIVE,
    );
    expect(strip.playerId).toBe('me');
    expect(strip.kitId).toBe('kamikaze');
    expect(strip.seatColorIndex).toBe(0);
    expect(strip.isActive).toBe(true);
    expect(strip.resources).toEqual({ lives: 7, shield: 3, shieldIsUpgraded: true, points: 12, upgradePoints: 2 });
  });

  it('shows the Shield thumb only while shield > 0', () => {
    const down = selfStrip(makePlayingView({ self: makeSelf({ shield: 0 }) }), LIVE);
    expect(down.thumbs.some((thumb) => thumb.ref.zone === 'shield')).toBe(false);
    const up = selfStrip(makePlayingView({ self: makeSelf({ shield: 1, shieldIsUpgraded: true }) }), LIVE);
    expect(up.thumbs[0]?.ref).toEqual({ zone: 'shield', ownerPlayerId: 'me', isUpgraded: true });
    expect(up.thumbs[0]?.instance).toEqual({ instanceId: 'active-shield', cardId: 'shield', isUpgraded: true });
  });

  it('orders Shield, own actives, then own ticking Sentences, with badges and art', () => {
    const view = makePlayingView({
      self: makeSelf({
        shield: 4,
        activePersistentEffects: [
          makePersistent({ id: 'poison-1', cardId: 'poison', counter: 2 }),
          makePersistent({ id: 'curse-1', cardId: 'curse' }),
          makePersistent({ id: 'invis-1', cardId: 'invisibility', counter: 3 }),
        ],
      }),
      pendingSentences: [
        { id: 'sentence-1', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false },
        { id: 'sentence-2', sourcePlayerId: 'p1', remainingOwnerTurns: 1, isUpgraded: false },
      ],
    });
    const strip = selfStrip(view, LIVE);
    expect(strip.thumbs.map((thumb) => thumb.ref.zone)).toEqual(['shield', 'active', 'active', 'active', 'sentence']);
    expect(strip.thumbs.every((thumb) => thumb.ref.ownerPlayerId === 'me')).toBe(true);
    expect(strip.thumbs.map((thumb) => thumb.actions.instanceId)).toEqual([
      'active-shield', 'poison-1', 'curse-1', 'invis-1', 'sentence-1',
    ]);
    expect(strip.thumbs.map((thumb) => thumb.badge)).toEqual([
      null,
      { kind: 'card-lives', value: 2 },
      null,
      { kind: 'turns', value: 3 },
      { kind: 'sentence-turns', value: 2 },
    ]);
    expect(strip.thumbs.map((thumb) => thumb.activatedArt)).toEqual([false, true, true, true, false]);
  });

  it('gives every thumb its in-play cardActions (L73-07)', () => {
    const view = makePlayingView({
      self: makeSelf({
        shield: 4,
        upgradePoints: 1,
        activePersistentEffects: [makePersistent({ id: 'poison-1', cardId: 'poison', counter: 2 })],
      }),
      pendingSentences: [{ id: 'sentence-1', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false }],
    });
    const strip = selfStrip(view, LIVE);
    for (const thumb of strip.thumbs) {
      expect(thumb.actions).toEqual(cardActions(view, thumb.ref, LIVE));
    }
    expect(strip.thumbs[1]?.actions.actions.find((action) => action.kind === 'upgrade')).toEqual({
      kind: 'upgrade', enabled: true, reason: null,
    });
  });

  it('lists own Block, attack ban, Invisibility and Reanimating badges (§6.1 item 3)', () => {
    expect(selfStrip(viewWith({ blockTurnsRemaining: 2, blockAttacksForbidden: true }), LIVE).flowBadges)
      .toEqual([{ kind: 'block', turnsLeft: 2 }]);
    expect(selfStrip(viewWith({ blockAttacksForbidden: true }), LIVE).flowBadges).toEqual([{ kind: 'attack-ban' }]);
    const invisible = makePlayingView({
      self: makeSelf({ activePersistentEffects: [makePersistent({ id: 'invis-1', cardId: 'invisibility', counter: 4 })] }),
    });
    expect(selfStrip(invisible, LIVE).flowBadges).toEqual([{ kind: 'invisibility', turnsLeft: 4 }]);
    const reanimating = viewWith({ isEliminated: true, pendingReanimation: { isUpgraded: false } }, { currentTurnPlayerId: 'p1' });
    expect(selfStrip(reanimating, LIVE).flowBadges).toEqual([{ kind: 'reanimating' }]);
  });

  it('shows own connection state and Duplication active', () => {
    const strip = selfStrip(
      viewWith(
        { duplicationActive: true, connection: { status: 'connected', disconnectedAt: null, automaticTurnsTaken: 0, consecutiveTimeouts: 2 } },
        { self: makeSelf({ kitId: 'duplicator' }), currentTurnPlayerId: 'p1' },
      ),
      LIVE,
    );
    expect(strip.connectionLabel).toBe('idle timeouts 2/5');
    expect(strip.duplicationActive).toBe(true);
  });
});

describe('selfStrip POV label (§6.3, §6.12)', () => {
  it('a seated POV has no label and no Leave', () => {
    expect(selfStrip(makePlayingView(), LIVE)).toMatchObject({ pov: 'seated', povLabel: null, leave: false });
  });

  it('an eliminated POV with pendingReanimation is Reanimating', () => {
    const view = viewWith({ isEliminated: true, pendingReanimation: { isUpgraded: true } }, { currentTurnPlayerId: 'p1' });
    expect(selfStrip(view, LIVE)).toMatchObject({ pov: 'reanimating', povLabel: 'Reanimating', leave: false });
  });

  it('an eliminated POV without pendingReanimation is Watching with Leave', () => {
    const view = viewWith({ isEliminated: true }, { currentTurnPlayerId: 'p1' });
    expect(selfStrip(view, LIVE)).toMatchObject({ pov: 'watching', povLabel: 'Watching', leave: true });
  });

  it('a walk-in is Watching with Leave and shows no kit, resources or thumbs (Q38)', () => {
    expect(selfStrip(walkInView(), LIVE)).toMatchObject({
      pov: 'walk-in-fogged', povLabel: 'Watching', leave: true,
      kitId: null, resources: null, thumbs: [], seatColorIndex: null,
      connectionLabel: null, flowBadges: [], isActive: false,
    });
  });

  it('offers no strip Leave on the finished board (the flag is Return home)', () => {
    const view = viewWith({ isEliminated: true }, { currentTurnPlayerId: null, turnDeadlineMs: null });
    expect(selfStrip(view, FINISHED)).toMatchObject({ povLabel: 'Watching', leave: false });
  });
});

describe('dock (§6.1 item 5, §6.12)', () => {
  it('Draw pays the kit catalog draw, enabled on turn and locked off-turn', () => {
    expect(selfStrip(makePlayingView(), LIVE).dock.draw).toEqual({ gain: 1, hot: false, enabled: true, reason: null });
    expect(selfStrip(makePlayingView({ self: makeSelf({ kitId: 'tactician' }) }), LIVE).dock.draw?.gain).toBe(4);
    expect(selfStrip(makePlayingView({ currentTurnPlayerId: 'p1' }), LIVE).dock.draw)
      .toEqual({ gain: 1, hot: false, enabled: false, reason: 'not-your-turn' });
  });

  it('a Gambler payout of 14 is hot (L64-05)', () => {
    const view = viewWith({ drawGain: 14 }, { self: makeSelf({ kitId: 'gambler' }) });
    expect(selfStrip(view, LIVE).dock.draw).toEqual({ gain: 14, hot: true, enabled: true, reason: null });
  });

  it('a Gambler payout of exactly 10, or no rolled payout, is not hot', () => {
    const rolled = viewWith({ drawGain: 10 }, { self: makeSelf({ kitId: 'gambler' }) });
    expect(selfStrip(rolled, LIVE).dock.draw).toMatchObject({ gain: 10, hot: false });
    const catalog = makePlayingView({ self: makeSelf({ kitId: 'gambler' }) });
    expect(selfStrip(catalog, LIVE).dock.draw).toMatchObject({ gain: 10, hot: false });
  });

  it('Unspy is enabled with a living spy, 10 points and on turn (L58-07)', () => {
    const view = viewWith({}, { self: makeSelf({ points: 10 }) }, SPY_P1);
    expect(selfStrip(view, LIVE).dock.unspy).toEqual({
      enabled: true, reason: null,
      cost: { kind: 'points', amount: CLEAR_SPY_COST },
      spyIds: ['p1'], preselectedSpyId: 'p1',
    });
  });

  it.each<{ reason: DisabledReason; view: PlayingStateView; ctx: ActionContext }>([
    { reason: 'no-living-spy', view: viewWith({}, { self: makeSelf({ points: 10 }) }), ctx: LIVE },
    { reason: 'not-enough-points', view: viewWith({}, { self: makeSelf({ points: 9 }) }, SPY_P1), ctx: LIVE },
    { reason: 'not-your-turn', view: viewWith({}, { self: makeSelf({ points: 10 }), currentTurnPlayerId: 'p1' }, SPY_P1), ctx: LIVE },
    { reason: 'actions-locked', view: viewWith({}, { self: makeSelf({ points: 10 }) }, SPY_P1), ctx: SUB_CHOICE },
  ])('Unspy is disabled with $reason', ({ reason, view, ctx }) => {
    expect(selfStrip(view, ctx).dock.unspy).toMatchObject({ enabled: false, reason });
    expect(DISABLED_REASON_COPY[reason]).not.toBe('');
  });

  it('Unspy ignores a spy that is eliminated (no living spy)', () => {
    const view = viewWith({}, { self: makeSelf({ points: 30 }) }, [
      makePlayer('p1', { spyingOnYou: true, isEliminated: true }),
      makePlayer('p2'),
    ]);
    expect(selfStrip(view, LIVE).dock.unspy).toMatchObject({ enabled: false, reason: 'no-living-spy', spyIds: [], preselectedSpyId: null });
  });

  it('preselects nobody when two living seats spy you', () => {
    const view = viewWith({}, { self: makeSelf({ points: 10 }) }, [
      makePlayer('p1', { spyingOnYou: true }),
      makePlayer('p2', { spyingOnYou: true }),
    ]);
    expect(selfStrip(view, LIVE).dock.unspy).toMatchObject({ enabled: true, spyIds: ['p1', 'p2'], preselectedSpyId: null });
  });

  it('Shop is always openable, browse-only off-turn or locked', () => {
    expect(selfStrip(makePlayingView(), LIVE).dock.shop).toEqual({ browseOnly: false });
    expect(selfStrip(makePlayingView({ currentTurnPlayerId: 'p1' }), LIVE).dock.shop).toEqual({ browseOnly: true });
    expect(selfStrip(makePlayingView(), SUB_CHOICE).dock.shop).toEqual({ browseOnly: true });
  });

  it('offers Activate duplication to a Duplicator only while it is not active (L28-02)', () => {
    const self = makeSelf({ kitId: 'duplicator' });
    expect(selfStrip(viewWith({ duplicationActive: false }, { self }), LIVE).dock.duplication)
      .toEqual({ enabled: true, reason: null });
    expect(selfStrip(viewWith({ duplicationActive: false }, { self, currentTurnPlayerId: 'p1' }), LIVE).dock.duplication)
      .toEqual({ enabled: false, reason: 'not-your-turn' });
    expect(selfStrip(viewWith({ duplicationActive: false }, { self }), SUB_CHOICE).dock.duplication)
      .toEqual({ enabled: false, reason: 'actions-locked' });
    expect(selfStrip(viewWith({ duplicationActive: true }, { self, currentTurnPlayerId: 'p1' }), LIVE).dock.duplication)
      .toBeNull();
    expect(selfStrip(makePlayingView(), LIVE).dock.duplication).toBeNull();
  });

  it('a walk-in has no economy (Q38)', () => {
    expect(selfStrip(walkInView(), LIVE).dock).toEqual({ draw: null, shop: null, unspy: null, duplication: null, stats: false });
  });

  it('an eliminated POV keeps a locked dock; Unspy stays only while Reanimating (§6.3)', () => {
    const watching = selfStrip(
      viewWith({ isEliminated: true }, { currentTurnPlayerId: 'p1', self: makeSelf({ points: 20 }) }, SPY_P1),
      LIVE,
    ).dock;
    expect(watching.draw).toMatchObject({ enabled: false, reason: 'actions-locked' });
    expect(watching.shop).toEqual({ browseOnly: true });
    expect(watching.unspy).toBeNull();
    expect(watching.stats).toBe(false);
    const reanimating = selfStrip(
      viewWith({ isEliminated: true, pendingReanimation: { isUpgraded: false } }, { currentTurnPlayerId: 'p1', self: makeSelf({ points: 20 }) }, SPY_P1),
      LIVE,
    ).dock;
    expect(reanimating.unspy).toMatchObject({ enabled: false, reason: 'actions-locked' });
  });

  it('the finished board shows Stats and no Draw, Unspy or duplication; Shop is browse-only (§6.12)', () => {
    const view = viewWith({}, { turnDeadlineMs: null, self: makeSelf({ kitId: 'duplicator', points: 30 }) }, SPY_P1);
    expect(selfStrip(view, FINISHED).dock).toEqual({ draw: null, shop: { browseOnly: true }, unspy: null, duplication: null, stats: true });
    expect(selfStrip(walkInView(), FINISHED).dock).toEqual({ draw: null, shop: null, unspy: null, duplication: null, stats: true });
  });
});
