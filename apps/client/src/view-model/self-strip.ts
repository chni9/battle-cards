/**
 * Self strip and dock — technical spec v7 §6.1 items 3 and 5, §6.3, §6.12 and §11 (Q38); L58-07
 * and L64-05; Appendix A `private-zone-identity`, `economy-bar` and `unspy-dialog`; Lot 73
 * (L73-09).
 *
 * What the POV's own strip shows (resources, cards in play, flow badges, connection) and which
 * economy controls the dock offers. Every value is a field the server sent this recipient, and
 * every availability comes from `availabilityFor` after the shared lock, so the dock is never
 * stricter than the server. A walk-in's `view.self` is the server filler `EMPTY_SPECTATOR_SELF`
 * (`build-view-for.ts`), so it is never read: a walk-in gets no kit, resources, thumbs or economy
 * (Q38). The POV mode, connection text and seat colour are L73-02's, shared with the seat list.
 */

import {
  CLEAR_SPY_COST,
  getKit,
  type KitId,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';

import type { StructuredCost } from '../ui/structured-cost';
import { actionLock, type ActionContext, type LockReason } from './action-lock';
import { availabilityFor, type ActionAvailability, type DisabledReason } from './action-reasons';
import { cardActions, inPlayThumbs, type CardActionsModel, type InPlayThumb } from './card-actions';
import { connectionLabel, povModeOf, seatColorIndexOf, type PovMode } from './seats';
import { livingSpiesOnYou } from './table-helpers';

/** §10.6 strings, keyed by the L73-02 `PovMode` values. Both are verbatim V2 text (flow-status-badges.tsx, table.tsx). */
export const SELF_STRIP_POV_LABELS = {
  reanimating: 'Reanimating',
  watching: 'Watching',
} as const satisfies Readonly<Record<Extract<PovMode, 'reanimating' | 'watching'>, string>>;

/** L64-05: Draw turns hot above the catalog Gambler payout (economy-bar.tsx `drawValue > 10`). */
export const DRAW_HOT_ABOVE = 10;

/** One own thumb: an L73-07 `InPlayThumb` (ref, instance, badge, activatedArt) plus its in-play actions. */
export interface SelfThumb extends InPlayThumb {
  /** `cardActions(view, thumb.ref, ctx)`; `ref.ownerPlayerId` is always `view.you`. */
  actions: CardActionsModel;
}

export interface SelfResources {
  lives: number;
  shield: number;
  shieldIsUpgraded: boolean;
  points: number;
  upgradePoints: number;
}

/** Turn-flow pills in V2 `flow-status-badges.tsx` order: Block (or its ban), Invisibility, Reanimating. */
export type SelfFlowBadge =
  | { kind: 'block'; turnsLeft: number }
  | { kind: 'attack-ban' }
  | { kind: 'invisibility'; turnsLeft: number | null }
  | { kind: 'reanimating' };

export interface DrawControl extends ActionAvailability {
  /** `players[you].drawGain` (Gambler's rolled payout), else the kit catalog draw. */
  gain: number;
  hot: boolean;
}

export interface DockShopEntry {
  /** True off-turn or while locked: the Shop opens but every buy is disabled (§6.1 item 5). */
  browseOnly: boolean;
}

export interface UnspyControl extends ActionAvailability {
  cost: StructuredCost;
  /** `livingSpiesOnYou(view)` ids, in `view.players` order. */
  spyIds: readonly string[];
  /** The single spy (L58-09), else null. */
  preselectedSpyId: string | null;
}

export interface DockModel {
  /** Null on the finished board and for a walk-in. */
  draw: DrawControl | null;
  /** Null only for a walk-in (Q38). */
  shop: DockShopEntry | null;
  /** Seated or Reanimating POV only; null on the finished board. */
  unspy: UnspyControl | null;
  /** Duplicator, not active, not finished, not a walk-in. */
  duplication: ActionAvailability | null;
  /** True exactly on the finished board (`ctx.readOnly`): Stats reopens Game over (§6.12). */
  stats: boolean;
}

export interface SelfStripModel {
  /** `view.you`. */
  playerId: string;
  /** `povModeOf(view)`. */
  pov: PovMode;
  /** Null when seated. */
  povLabel: string | null;
  /** The strip's Leave: a Watching or walk-in POV, never on the finished board (its flag is Return home). */
  leave: boolean;
  /** `seatColorIndexOf(view, view.you)`; null for a walk-in. */
  seatColorIndex: number | null;
  /** `currentTurnPlayerId === view.you`. */
  isActive: boolean;
  /** Null for a walk-in. */
  kitId: KitId | null;
  /** Null for a walk-in. */
  resources: SelfResources | null;
  /** Shield (only while `self.shield > 0`), own actives, then own ticking Sentences (`inPlayThumbs`). */
  thumbs: readonly SelfThumb[];
  /** `connectionLabel(players[you])`: null when connected or eliminated, and for a walk-in. */
  connectionLabel: string | null;
  flowBadges: readonly SelfFlowBadge[];
  /** A boolean, not a badge: V2 shows it as separate text. */
  duplicationActive: boolean;
  dock: DockModel;
}

/**
 * The POV's own strip and, in `.dock`, its dock (§4.3 names only `selfStrip`). `ctx.readOnly` is
 * the finished board, where `view` is `finished.finalTable`.
 */
export function selfStrip(view: PlayingStateView, ctx: ActionContext): SelfStripModel {
  const pov = povModeOf(view);
  const lock = actionLock(view, ctx);
  const me = view.players.find((player) => player.id === view.you);
  const walkIn = view.isSpectator === true;

  return {
    playerId: view.you,
    pov,
    povLabel: povLabelOf(pov),
    leave: !ctx.readOnly && (pov === 'watching' || pov === 'walk-in-fogged'),
    seatColorIndex: walkIn ? null : seatColorIndexOf(view, view.you),
    isActive: view.currentTurnPlayerId === view.you,
    kitId: walkIn ? null : view.self.kitId,
    resources: walkIn ? null : resourcesOf(view),
    thumbs: walkIn
      ? []
      : inPlayThumbs(view, view.you).map((thumb) => ({
          ...thumb,
          actions: cardActions(view, thumb.ref, ctx),
        })),
    connectionLabel: me === undefined ? null : connectionLabel(me),
    flowBadges: me === undefined ? [] : flowBadgesOf(view, me),
    duplicationActive: me?.duplicationActive === true,
    dock: dockFor(view, ctx, pov, me, lock),
  };
}

function povLabelOf(pov: PovMode): string | null {
  switch (pov) {
    case 'seated':
      return null;
    case 'reanimating':
      return SELF_STRIP_POV_LABELS.reanimating;
    case 'watching':
    case 'walk-in-fogged':
      return SELF_STRIP_POV_LABELS.watching;
  }
}

function resourcesOf(view: PlayingStateView): SelfResources {
  const { self } = view;
  return {
    lives: self.lives,
    shield: self.shield,
    shieldIsUpgraded: self.shieldIsUpgraded,
    points: self.points,
    upgradePoints: self.upgradePoints,
  };
}

/**
 * V2 `FlowStatusBadges` precedence: Block turns win over the attack ban. Invisibility reads the
 * private copy of the POV's actives (`self.activePersistentEffects`), where its turns left live.
 */
function flowBadgesOf(view: PlayingStateView, me: PublicPlayerView): SelfFlowBadge[] {
  const badges: SelfFlowBadge[] = [];
  if (me.blockTurnsRemaining > 0) {
    badges.push({ kind: 'block', turnsLeft: me.blockTurnsRemaining });
  } else if (me.blockAttacksForbidden) {
    badges.push({ kind: 'attack-ban' });
  }
  const invisibility = view.self.activePersistentEffects.find(
    (effect) => effect.cardId === 'invisibility',
  );
  if (invisibility !== undefined) {
    badges.push({ kind: 'invisibility', turnsLeft: invisibility.counter });
  }
  if (me.pendingReanimation !== null) {
    badges.push({ kind: 'reanimating' });
  }
  return badges;
}

/**
 * The server's order for Clear Spy: the lock, then the spy, then the points (`clear-spy.ts`
 * checks the spy before `payCost`).
 */
function unspyReasonOf(
  view: PlayingStateView,
  spyCount: number,
  lock: LockReason | null,
): DisabledReason | null {
  if (lock !== null) {
    return lock;
  }
  if (spyCount === 0) {
    return 'no-living-spy';
  }
  return view.self.points < CLEAR_SPY_COST ? 'not-enough-points' : null;
}

function dockFor(
  view: PlayingStateView,
  ctx: ActionContext,
  pov: PovMode,
  me: PublicPlayerView | undefined,
  lock: LockReason | null,
): DockModel {
  if (view.isSpectator === true) {
    return { draw: null, shop: null, unspy: null, duplication: null, stats: ctx.readOnly };
  }
  const shop: DockShopEntry = { browseOnly: lock !== null };
  if (ctx.readOnly) {
    return { draw: null, shop, unspy: null, duplication: null, stats: true };
  }
  const gain = me?.drawGain ?? getKit(view.self.kitId).startingResources.draw;
  const spyIds = livingSpiesOnYou(view).map((player) => player.id);
  return {
    draw: { gain, hot: gain > DRAW_HOT_ABOVE, ...availabilityFor(lock) },
    shop,
    unspy:
      pov === 'seated' || pov === 'reanimating'
        ? {
            cost: { kind: 'points', amount: CLEAR_SPY_COST },
            spyIds,
            preselectedSpyId: spyIds.length === 1 ? (spyIds[0] ?? null) : null,
            ...availabilityFor(unspyReasonOf(view, spyIds.length, lock)),
          }
        : null,
    duplication:
      view.self.kitId === 'duplicator' && me?.duplicationActive !== true
        ? availabilityFor(lock)
        : null,
    stats: false,
  };
}
