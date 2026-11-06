/**
 * Test-only builders for arena component tests (Lot 74 plan Appendix A.4). Shipped code never
 * imports this file.
 *
 * Tier fields are exactly the technical spec v7 §6.3 wire fields: a base Spy relation sends the
 * live resources, Spy+ adds `kitId`, `hand` and `specialCards`, an eliminated seat carries its
 * death freeze.
 */

import {
  TUTORIAL_BOT_HAND_CARD_IDS,
  TUTORIAL_BOT_KIT_ID,
  TUTORIAL_BOT_LIVES,
  TUTORIAL_HUMAN_KIT_ID,
  TUTORIAL_HUMAN_LIVES,
  TUTORIAL_HUMAN_POINTS,
  TUTORIAL_HUMAN_UPGRADE_POINTS,
  TUTORIAL_LOOK_INDEX,
  TUTORIAL_STEPS,
  tutorialStepAt,
  type CardId,
  type CardInstance,
  type KitId,
  type PendingEffectView,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';
import { act } from 'react';
import { expect, vi, type MockInstance } from 'vitest';

import type { LayoutBox, Size } from '../../view-model/seat-layout';
import {
  makeCard,
  makeEliminationReveal,
  makePending,
  makePlayer,
  makeSelf,
  makeTableView,
} from '../../view-model/test-fixtures';
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
    lastTurnStarted: null,
    cachedLobbyRules: null,
    connectionStatus: 'connected',
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

export interface ArenaLayoutStubOptions {
  /** A per-element box (FX anchors, hint anchors); `undefined` falls back to the arena box. */
  readonly rectFor?: (element: Element) => DOMRect | undefined;
}

export interface ArenaLayoutStub {
  /** Sets the fake `visualViewport` and dispatches its `resize`: the mode follows (useVisualViewportBox). */
  setViewport(width: number, height: number): void;
  /** Sets the box every unmatched element reports and fires every fake ResizeObserver callback. */
  setArena(width: number, height: number): void;
  /** Restores visualViewport, ResizeObserver and getBoundingClientRect. Callers also run it in afterEach. */
  restore(): void;
}

/**
 * Call before rendering (Lot 75 plan Appendix A.10, L75-02): a fake `visualViewport` at `viewport`,
 * `vi.stubGlobal('ResizeObserver', …)` with a fake whose callbacks `setArena` fires (happy-dom's
 * never fires), and a `getBoundingClientRect` spy that reports `rectFor(element)` or the arena box.
 * The `use-arena-layout-box.test.tsx` pattern, shared. `restore` is idempotent.
 */
export function stubArenaLayout(viewport: Size, arena: Size, options: ArenaLayoutStubOptions = {}): ArenaLayoutStub {
  const { rectFor } = options;
  const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  const fake = Object.assign(new EventTarget(), {
    width: viewport.width,
    height: viewport.height,
    offsetTop: 0,
    offsetLeft: 0,
  });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });

  const box: Size = { width: arena.width, height: arena.height };
  const observers = new Set<FakeResizeObserver>();
  class FakeResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(): void {
      observers.add(this);
    }
    unobserve(): void {
      // The arena hooks observe one element each, so unobserving it ends the callbacks.
      observers.delete(this);
    }
    disconnect(): void {
      observers.delete(this);
    }
    fire(): void {
      this.callback([], this);
    }
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  const rect = vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      return rectFor?.(this) ?? new DOMRect(0, 0, box.width, box.height);
    });

  let restored = false;
  return {
    setViewport(width, height) {
      act(() => {
        fake.width = width;
        fake.height = height;
        fake.dispatchEvent(new Event('resize'));
      });
    },
    setArena(width, height) {
      act(() => {
        box.width = width;
        box.height = height;
        for (const observer of [...observers]) observer.fire();
      });
    },
    restore() {
      if (restored) return;
      restored = true;
      if (original === undefined) Reflect.deleteProperty(window, 'visualViewport');
      else Object.defineProperty(window, 'visualViewport', original);
      rect.mockRestore();
      observers.clear();
      vi.unstubAllGlobals();
    },
  };
}

/**
 * Named layout boxes (A.10). The arena heights are the Lot 74 gate's measured or back-solved values
 * (L74-26 G1–G2; open-question ruling 3); the controller's browser check re-measures them. Pass one
 * of these, never ad hoc numbers.
 */
export const ARENA_TEST_BOXES: {
  readonly phone360: LayoutBox;
  readonly phone375: LayoutBox;
  readonly phone390: LayoutBox;
  readonly duplicator360: LayoutBox;
  readonly tablet: LayoutBox;
  readonly landscape: LayoutBox;
  readonly landscapeSmall: LayoutBox;
  readonly desktop: LayoutBox;
} = {
  /** L74-26 G1, back-solved from the 82 px overlap. */
  phone360: { viewport: { width: 360, height: 740 }, arena: { width: 360, height: 214 } },
  /** Back-solved from the 14 px overlap. */
  phone375: { viewport: { width: 375, height: 812 }, arena: { width: 375, height: 282 } },
  /** Check 1 (2026-11-06), measured with 3 seats: the full strip is 116 px at 390 (two pill rows), not 160. */
  phone390: { viewport: { width: 390, height: 844 }, arena: { width: 390, height: 354 } },
  /** 214 − (174 − 100): the 2-seat Duplicator's two-row dock. */
  duplicator360: { viewport: { width: 360, height: 740 }, arena: { width: 360, height: 140 } },
  /** Check 1 (2026-11-06), measured at 768×1024 (portrait, full band). */
  tablet: { viewport: { width: 768, height: 1024 }, arena: { width: 768, height: 469 } },
  /** Check 1 (2026-11-06), measured with 8 seats: 390 − 91 top row − 141 bottom row. */
  landscape: { viewport: { width: 844, height: 390 }, arena: { width: 844, height: 159 } },
  /** Check 1 (2026-11-06), measured with 8 seats: 375 − 91 − 124. */
  landscapeSmall: { viewport: { width: 667, height: 375 }, arena: { width: 667, height: 160 } },
  /** Check 1 (2026-11-06), measured at 1440×900: the 336 px log column leaves a 1104 px arena. */
  desktop: { viewport: { width: 1440, height: 900 }, arena: { width: 1104, height: 489 } },
};

/** The 16 human tutorial indices: 0, then odd 1–29 (`TUTORIAL_STEPS` actor 'human'; plan A.10, L75-04). */
export const TUTORIAL_HUMAN_INDICES: readonly number[] = TUTORIAL_STEPS.filter((step) => step.actor === 'human').map(
  (step) => step.index,
);

/** The incoming effect on 'me' from 'p1' that the script expects at these indices (bot plays at index − 1). */
const TUTORIAL_INCOMING: Readonly<Record<number, CardId>> = {
  3: 'basic-attack',
  11: 'spy',
  17: 'strong-attack',
  19: 'thief',
  29: 'strong-attack',
};

/** The POV's hand at `index`: the setup hand, then each scripted upgrade, sale and buy. */
function tutorialHand(index: number): CardInstance[] {
  const hand = [
    makeCard('tax'),
    makeCard('spy', { isUpgraded: index >= 6 }),
    makeCard('basic-attack', { isUpgraded: index >= 24 }),
    ...(index >= 10 ? [] : [makeCard('shield')]),
    makeCard('shield', { instanceId: 'shield-2' }),
  ];
  return index >= 16 ? [...hand, makeCard('absorber')] : hand;
}

function tutorialLives(index: number): number {
  if (index < 2) return TUTORIAL_HUMAN_LIVES;
  return index >= 20 ? 4 : 1;
}

function tutorialUpgradePoints(index: number): number {
  if (index < 6 || (index >= 14 && index < 24)) return TUTORIAL_HUMAN_UPGRADE_POINTS;
  return 0;
}

/**
 * A 2-seat tutorial view at `index` (plan A.10, L75-04): 'me' (Indestructible) vs bot 'p1' (Ghost),
 * playKind 'tutorial', tutorialIndex = index, the POV's turn on human indices, and the hand, specials,
 * resources and pending effects the script expects there (`packages/shared/src/tutorial/setup.ts` and
 * the script). It keeps the setup's points at every index and replays no server state. 'p1' is
 * Spy+-revealed from `TUTORIAL_LOOK_INDEX`. `overrides` spread last.
 */
export function makeTutorialArenaView(index: number, overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  const step = tutorialStepAt(index);
  if (step === undefined) {
    throw new RangeError(`no tutorial step at index ${String(index)}`);
  }
  const human = step.actor === 'human';
  const self = makeSelf({
    kitId: TUTORIAL_HUMAN_KIT_ID,
    points: TUTORIAL_HUMAN_POINTS,
    lives: tutorialLives(index),
    upgradePoints: tutorialUpgradePoints(index),
    hand: tutorialHand(index),
    specialCards: index >= 20 ? [] : [makeCard('super-regeneration')],
  });
  const spied = {
    lives: index >= 26 ? 1 : TUTORIAL_BOT_LIVES,
    points: 10,
    upgradePoints: 0,
    shield: 0,
    kitId: TUTORIAL_BOT_KIT_ID,
    hand: TUTORIAL_BOT_HAND_CARD_IDS.map((id) => makeCard(id, { instanceId: `p1-${id}` })),
    specialCards: [],
  };
  const players = [
    makePlayer('me', { isYou: true }),
    makePlayer('p1', { isBot: true, botDifficulty: 'normal', ...(index >= TUTORIAL_LOOK_INDEX ? { spied } : {}) }),
  ];
  const incoming = TUTORIAL_INCOMING[index];
  const pendingEffects: PendingEffectView[] =
    incoming === undefined
      ? []
      : [makePending({ id: `tut-${String(index)}`, sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: incoming, queuedAt: index - 1 })];
  return makeArenaView({
    seatCount: 2,
    overrides: {
      playKind: 'tutorial',
      tutorialIndex: index,
      currentTurnPlayerId: human ? 'me' : 'p1',
      turnSequence: index + 1,
      players,
      self,
      pendingEffects,
      ...overrides,
    },
  });
}
