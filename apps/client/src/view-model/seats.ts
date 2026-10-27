/**
 * Seat models — technical spec v7 §6.2 (seat anatomy: at most two status badges plus "+n"),
 * §6.3 (visibility tiers) and §11 (Q36, Q46, Q47, Q66); Lot 73 (L73-02).
 *
 * Every value here comes from a wire field the server sent this recipient: `spied`,
 * `eliminationReveal`, `spyingOnYou` and the public statuses. Nothing is inferred from the
 * action log, so a resolved Spy line never unfogs a seat, and the dead pre-Lot-69
 * `spied.resourcesSnapshot` is never read (spec v7 §14.1). Opponents carry no hand count
 * anywhere (`state-view.ts`, designer ruling 2026-07-30).
 */

import {
  LOG_RESOURCE_KINDS,
  type BotDifficulty,
  type CardInstance,
  type KitId,
  type LogResourceKind,
  type PendingSentenceView,
  type PersistentEffectView,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';

import { avatarInitial } from '../ui/primitives/avatar-initial';
import { seatIndexOf } from '../ui/seat-colors';
import { connectionBadgeLabel } from '../ui/seat/connection-badge-label';
import { opponentResourceDisplay } from './opponent-seat-resources';
import { layoutSeats, type LayoutBox, type SeatLayout } from './seat-layout';
import { hasFullSpyCardReveal, visibleKitId } from './table-helpers';

/** What the POV knows of a seat (§6.3): nothing, live numbers, the kit and cards too, or the death freeze. */
export type SeatTier = 'unspied' | 'base-spy' | 'spy-plus' | 'eliminated';

/** How the POV sits at the table: seated, reviving, watching as a spectator, or a walk-in before Stay (§6.12, L57-16). */
export type PovMode = 'seated' | 'reanimating' | 'watching' | 'walk-in-fogged';

export interface SeatResource {
  kind: LogResourceKind;
  value: number | '?';
}

/**
 * Badge order, first to last (decisions.md 2026-10-27 "V7 seat tiers and badge order"). Both
 * Spy-gated kit windows, Duplication and draw gain, come after the persistents.
 */
export const SEAT_BADGE_KINDS = [
  'spying-on-you',
  'block',
  'invisibility',
  'sentence',
  'shield',
  'persistent',
  'duplication',
  'draw-gain',
  'reanimation',
  'absorb-window',
] as const;

export type SeatBadgeKind = (typeof SEAT_BADGE_KINDS)[number];

/** A seat shows this many badges, then "+badgeOverflow"; the seat sheet lists all (§6.2). */
export const SEAT_VISIBLE_BADGE_COUNT = 2;

export type SeatBadge =
  | { kind: 'spying-on-you' }
  /** 0 = attack ban only, the last chain turn (L25-01). */
  | { kind: 'block'; turnsRemaining: number }
  /** Turns left = `effect.counter` (L58-06). */
  | { kind: 'invisibility'; effect: PersistentEffectView }
  /** Remaining owner turns, not card lives. */
  | { kind: 'sentence'; sentence: PendingSentenceView }
  /** Presence and tier only: the value is private (PROTOCOL 20). */
  | { kind: 'shield'; isUpgraded: boolean }
  /** Card lives = `effect.counter` (L56-06). */
  | { kind: 'persistent'; effect: PersistentEffectView }
  /** Spy-gated `duplicationActive`. */
  | { kind: 'duplication' }
  /** Spy-gated Gambler `drawGain` (Q47). */
  | { kind: 'draw-gain'; amount: number }
  /** Eliminated seats only. */
  | { kind: 'reanimation'; isUpgraded: boolean }
  /** Eliminated seats only. */
  | { kind: 'absorb-window' };

export type SeatAvatar = { kind: 'kit'; kitId: KitId } | { kind: 'initial'; initial: string };

export interface SeatReveal {
  /** Same values as the V2 `OpponentRevealDialog` `mode`. */
  mode: 'spy' | 'elimination';
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
}

export interface SeatModel {
  playerId: string;
  nickname: string;
  /** `seatColorIndexOf(view, playerId)`. */
  seatColorIndex: number;
  tier: SeatTier;
  avatar: SeatAvatar;
  /** Tier `unspied` or `base-spy`: a base Spy never shows the kit (§6.3, Q66). */
  kitHidden: boolean;
  /** Always four, in `LOG_RESOURCE_KINDS` order. */
  resources: readonly SeatResource[];
  /** Every badge, in `SEAT_BADGE_KINDS` order. */
  badges: readonly SeatBadge[];
  /** `max(0, badges.length - SEAT_VISIBLE_BADGE_COUNT)`: the "+n". */
  badgeOverflow: number;
  isActive: boolean;
  /** Mirrors `tier === 'eliminated'`. */
  isEliminated: boolean;
  /** Null for a human, an eliminated seat, or any seat in the tutorial (L17-03). */
  botDifficulty: BotDifficulty | null;
  connectionLabel: string | null;
  /** Spy+ live, or death-frozen, hand and specials. */
  reveal: SeatReveal | null;
}

export interface SeatList {
  pov: PovMode;
  /** Every seat but the POV's, in `view.players` order. */
  seats: readonly SeatModel[];
}

/**
 * Which relation the recipient has to the table (§6.3, §6.12). A walk-in is `watching` once any
 * seat carries `spied` (the overlay is granted after Stay, L57-16): the same test as
 * `screens/claim-seat.ts` `walkInSeesPrivateHands`, which the view-model cannot import.
 */
export function povModeOf(view: PlayingStateView): PovMode {
  if (view.isSpectator === true) {
    return view.players.some((player) => player.spied !== undefined) ? 'watching' : 'walk-in-fogged';
  }
  const me = view.players.find((player) => player.isYou);
  if (me?.isEliminated !== true) {
    return 'seated';
  }
  return me.pendingReanimation !== null ? 'reanimating' : 'watching';
}

/**
 * Seat colour (L39-03): the `view.players` position through `seatIndexOf`, else that position
 * past the palette, else 0. The fallbacks are never reached on a real table of at most 8 seats;
 * they keep the result a plain `number` without a cast.
 */
export function seatColorIndexOf(view: PlayingStateView, playerId: string): number {
  const paletteIndex = seatIndexOf(view, playerId);
  if (paletteIndex !== null) {
    return paletteIndex;
  }
  const position = view.players.findIndex((player) => player.id === playerId);
  return position >= 0 ? position : 0;
}

/**
 * Connection badge text (`connectionBadgeLabel`, L10-04), or null when connected or eliminated.
 * V2 hides the badge on a dead seat (`opponent-zone.tsx`), where `connectionBadgeLabel` alone
 * would say "eliminated".
 */
export function connectionLabel(player: PublicPlayerView): string | null {
  return player.isEliminated ? null : connectionBadgeLabel(player);
}

export function seatList(view: PlayingStateView): SeatList {
  return {
    pov: povModeOf(view),
    seats: view.players.filter((player) => !player.isYou).map((player) => seatModelOf(view, player)),
  };
}

/** The seat list plus where each seat sits (spec v7 §4.3, §6.4). `seats` keeps `view.players` order; the layout carries the drawing order. */
export interface SeatsModel extends SeatList {
  layout: SeatLayout;
}

export function seats(view: PlayingStateView, layoutBox: LayoutBox): SeatsModel {
  return { ...seatList(view), layout: layoutSeats(view, layoutBox) };
}

function seatModelOf(view: PlayingStateView, player: PublicPlayerView): SeatModel {
  const tier = tierOf(player);
  const eliminated = tier === 'eliminated';
  const badges = badgesOf(view, player, eliminated);
  const kitId = visibleKitId(player);

  return {
    playerId: player.id,
    nickname: player.nickname,
    seatColorIndex: seatColorIndexOf(view, player.id),
    tier,
    avatar:
      kitId !== null
        ? { kind: 'kit', kitId }
        : { kind: 'initial', initial: avatarInitial(player.nickname) },
    kitHidden: tier === 'unspied' || tier === 'base-spy',
    resources: resourcesOf(player),
    badges,
    badgeOverflow: Math.max(0, badges.length - SEAT_VISIBLE_BADGE_COUNT),
    isActive: view.currentTurnPlayerId === player.id,
    isEliminated: eliminated,
    botDifficulty: eliminated || view.playKind === 'tutorial' ? null : (player.botDifficulty ?? null),
    connectionLabel: connectionLabel(player),
    reveal: revealOf(player),
  };
}

/**
 * Wire fields only. A dead seat also carries spectator `spied` once the POV watches, so the
 * death freeze has to win or the seat would print live post-death numbers (§6.3).
 */
function tierOf(player: PublicPlayerView): SeatTier {
  if (player.isEliminated || player.eliminationReveal !== undefined) {
    return 'eliminated';
  }
  if (player.spied?.kitId !== undefined) {
    return 'spy-plus';
  }
  return player.spied !== undefined ? 'base-spy' : 'unspied';
}

/** The `OpponentLiveResources` field behind each log resource kind. */
const RESOURCE_FIELD = {
  life: 'lives',
  point: 'points',
  upgradePoint: 'upgradePoints',
  shield: 'shield',
} as const satisfies Record<LogResourceKind, string>;

function resourcesOf(player: PublicPlayerView): readonly SeatResource[] {
  const display = opponentResourceDisplay(player);
  return LOG_RESOURCE_KINDS.map((kind) => ({
    kind,
    value: display.known ? display.values[RESOURCE_FIELD[kind]] : '?',
  }));
}

function revealOf(player: PublicPlayerView): SeatReveal | null {
  const frozen = player.eliminationReveal;
  if (frozen !== undefined) {
    return { mode: 'elimination', hand: frozen.hand, specialCards: frozen.specialCards };
  }
  const spied = player.spied;
  if (hasFullSpyCardReveal(player) && spied?.hand !== undefined && spied.specialCards !== undefined) {
    return { mode: 'spy', hand: spied.hand, specialCards: spied.specialCards };
  }
  return null;
}

/**
 * Pushed in `SEAT_BADGE_KINDS` order, never sorted. An eliminated seat keeps only the two
 * statuses that exist on a dead seat: death dumps its actives and cancels its Sentences
 * (`cleanupEliminatedPlayer`), and V2 hides its eye (decisions.md 2026-10-27).
 * `activeAttackBlock` renders nothing (Q36).
 */
function badgesOf(view: PlayingStateView, player: PublicPlayerView, eliminated: boolean): SeatBadge[] {
  const badges: SeatBadge[] = [];

  if (!eliminated) {
    if (player.spyingOnYou === true) {
      badges.push({ kind: 'spying-on-you' });
    }
    if (player.blockTurnsRemaining > 0 || player.blockAttacksForbidden) {
      badges.push({ kind: 'block', turnsRemaining: player.blockTurnsRemaining });
    }
    for (const effect of player.activePersistentEffects) {
      if (effect.cardId === 'invisibility') {
        badges.push({ kind: 'invisibility', effect });
      }
    }
    for (const sentence of view.pendingSentences) {
      if (sentence.sourcePlayerId === player.id) {
        badges.push({ kind: 'sentence', sentence });
      }
    }
    if (player.activeShield !== null) {
      badges.push({ kind: 'shield', isUpgraded: player.activeShield.isUpgraded });
    }
    for (const effect of player.activePersistentEffects) {
      if (effect.cardId !== 'invisibility') {
        badges.push({ kind: 'persistent', effect });
      }
    }
    if (player.duplicationActive) {
      badges.push({ kind: 'duplication' });
    }
    if (player.drawGain !== undefined) {
      badges.push({ kind: 'draw-gain', amount: player.drawGain });
    }
  }

  if (player.pendingReanimation !== null) {
    badges.push({ kind: 'reanimation', isUpgraded: player.pendingReanimation.isUpgraded });
  }
  if (player.absorbWindowOpen) {
    badges.push({ kind: 'absorb-window' });
  }

  return badges;
}
