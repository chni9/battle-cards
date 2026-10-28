/**
 * Test-only builders for arena component tests (Lot 74 plan Appendix A.4). Shipped code never
 * imports this file.
 *
 * Tier fields are exactly the technical spec v7 §6.3 wire fields: a base Spy relation sends the
 * live resources, Spy+ adds `kitId`, `hand` and `specialCards`, an eliminated seat carries its
 * death freeze.
 */

import type { KitId, PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import { expect, vi, type MockInstance } from 'vitest';

import { makeCard, makeEliminationReveal, makePlayer, makeTableView } from '../../view-model/test-fixtures';
import { STATUS_LABELS } from '../status-labels';
import type { ArenaScreenProps } from './arena-screen';

export type ArenaSeatTier = 'unspied' | 'base-spy' | 'spy-plus' | 'eliminated';
export type ArenaPov = 'seated' | 'walk-in' | 'eliminated' | 'reanimating';

export interface ArenaViewOptions {
  /** Total seats including the POV (2–8). Seat ids: 'me', then 'p1'…'p7'. Default 3. */
  seatCount?: number;
  /** Tier per opponent id; unlisted opponents are unspied. */
  tiers?: Readonly<Record<string, ArenaSeatTier>>;
  /** Default 'seated'. 'walk-in' makes every seat a non-POV seat (you = 'watcher'). */
  pov?: ArenaPov;
  /** Spread last (after the tiers and the POV are applied). */
  overrides?: Partial<PlayingStateView>;
}

/** Live resources every Spy relation sends (§6.3): base Spy and Spy+ seats carry exactly these. */
export const ARENA_SPIED_RESOURCES = { lives: 7, points: 12, upgradePoints: 1, shield: 2 } as const;

/** The Spy+ kit (Appendix A.4). */
export const ARENA_SPY_PLUS_KIT: KitId = 'tactician';

/** The intent callbacks `arenaSpies` reads, in this order. */
export const ARENA_INTENT_PROPS = [
  'onDraw',
  'onPlayCard',
  'onPlayMultipleAttacks',
  'onResolveSubChoice',
  'onBuyCard',
  'onSellCard',
  'onUpgradeCard',
  'onBuyUpgradePoint',
  'onBuySpecialCard',
  'onBuyPoolCard',
  'onClearSpy',
  'onSellUpgradePoint',
  'onLeave',
  'onForfeit',
  'onSendChat',
  'onDeactivatePersistent',
  'onActivateDuplication',
] as const satisfies readonly (keyof ArenaScreenProps)[];

const MIN_SEATS = 2;
const MAX_SEATS = 8;

function opponentFor(id: string, tier: ArenaSeatTier): PublicPlayerView {
  switch (tier) {
    case 'unspied':
      return makePlayer(id);
    case 'base-spy':
      return makePlayer(id, { spied: { ...ARENA_SPIED_RESOURCES } });
    case 'spy-plus':
      return makePlayer(id, {
        spied: {
          ...ARENA_SPIED_RESOURCES,
          kitId: ARENA_SPY_PLUS_KIT,
          hand: [
            makeCard('basic-attack', { instanceId: `${id}-basic-attack` }),
            makeCard('spy', { instanceId: `${id}-spy` }),
          ],
          specialCards: [],
        },
      });
    case 'eliminated':
      return makePlayer(id, { isEliminated: true, eliminationReveal: makeEliminationReveal() });
  }
}

function povPlayer(pov: Exclude<ArenaPov, 'walk-in'>): PublicPlayerView {
  switch (pov) {
    case 'seated':
      return makePlayer('me', { isYou: true });
    case 'eliminated':
      return makePlayer('me', {
        isYou: true,
        isEliminated: true,
        eliminationReveal: makeEliminationReveal(),
      });
    case 'reanimating':
      return makePlayer('me', {
        isYou: true,
        isEliminated: true,
        eliminationReveal: makeEliminationReveal(),
        pendingReanimation: { isUpgraded: false },
      });
  }
}

export function makeArenaView(options: ArenaViewOptions = {}): PlayingStateView {
  const { seatCount = 3, tiers = {}, pov = 'seated', overrides } = options;
  if (!Number.isInteger(seatCount) || seatCount < MIN_SEATS || seatCount > MAX_SEATS) {
    throw new RangeError(`seatCount must be an integer from ${MIN_SEATS} to ${MAX_SEATS}, got ${seatCount}`);
  }
  const walkIn = pov === 'walk-in';
  const ids = ['me', ...Array.from({ length: seatCount - 1 }, (_, index) => `p${index + 1}`)];
  const players = ids.map((id) =>
    id === 'me' && !walkIn ? povPlayer(pov) : opponentFor(id, tiers[id] ?? 'unspied'),
  );
  return makeTableView(ids, {
    you: walkIn ? 'watcher' : 'me',
    ...(walkIn ? { isSpectator: true as const } : {}),
    players,
    ...overrides,
  });
}

/** Every `ArenaScreenProps` callback is a `vi.fn()`; `view` defaults to `makeArenaView()`. */
export function makeArenaProps(overrides: Partial<ArenaScreenProps> = {}): ArenaScreenProps {
  return {
    view: makeArenaView(),
    actionReject: null,
    onDismissActionReject: vi.fn(),
    statusLabel: STATUS_LABELS.connected,
    nowMs: 0,
    deadlineMs: null,
    lastActionResolved: null,
    subChoice: null,
    onDraw: vi.fn(),
    onPlayCard: vi.fn(),
    onPlayMultipleAttacks: vi.fn(),
    onResolveSubChoice: vi.fn(),
    onBuyCard: vi.fn(),
    onSellCard: vi.fn(),
    onUpgradeCard: vi.fn(),
    onBuyUpgradePoint: vi.fn(),
    onBuySpecialCard: vi.fn(),
    onBuyPoolCard: vi.fn(),
    onClearSpy: vi.fn(),
    onSellUpgradePoint: vi.fn(),
    onLeave: vi.fn(),
    onForfeit: vi.fn(),
    onSendChat: vi.fn(),
    onDeactivatePersistent: vi.fn(),
    onActivateDuplication: vi.fn(),
    ...overrides,
  };
}

/** The `vi.fn()` behind each `ARENA_INTENT_PROPS` callback of `props` (commit-rule checks, §6.6.4). */
export function arenaSpies(props: ArenaScreenProps): readonly MockInstance[] {
  return ARENA_INTENT_PROPS.flatMap((name) => {
    const fn = props[name];
    return fn !== undefined && vi.isMockFunction(fn) ? [fn] : [];
  });
}

/**
 * The commit rule (§6.6.4): asserts that every intent spy of `props` has zero calls. The only
 * "nothing sent" helper (Appendix A.4).
 */
export function expectNoArenaIntent(props: ArenaScreenProps): void {
  for (const spy of arenaSpies(props)) {
    expect(spy).not.toHaveBeenCalled();
  }
}
