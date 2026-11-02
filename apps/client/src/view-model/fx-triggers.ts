/**
 * FX trigger decisions shared by both boards — technical spec v7 §6.6.2, §6.12, §8.1, Q63; moved
 * from `screens/table.tsx` (L74-17).
 *
 * Pure: every choice the table's FX effects made (which resolution flashes, which eliminations
 * beat, which public-log entries fly, in what order, and which own intents fly a card) lives here;
 * `fx/use-table-fx-triggers.ts` measures and enqueues. Elimination beats are seeded from the log a
 * mount starts with, so a reconnect or the finished board replays none (Q63). The POV's own log
 * play flies nothing here (§6.6.2): its ghost leaves from the hand through `ownIntentFxSteps`.
 */

import type {
  ActionLogEntryView,
  ActionResolvedPayload,
  CardId,
  CardInstance,
  KitId,
  PlayerEliminatedLogEntry,
  PublicPlayerView,
} from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl, type CardBackKind } from '../ui/asset-lookup';
import type { Point } from './drop-target';
import type { OpponentLiveResources } from './opponent-seat-resources';
import {
  actionLogFlyoutKey,
  boostStealChipsWithRecentYield,
  chipsForPublicLogEntry,
  deckCardGhostForPublicLogEntry,
  leftoverLiveFlowChips,
  playCardGhostsForPublicLogEntry,
  regenFlowChips,
  stealTransferChips,
  type DeckCardGhost,
  type DirectedTokenChip,
} from './opponent-token-chips';

/** `${effectId}:${outcome}` (V2): one flash per effect and outcome. */
export function resolutionFlashKey(resolved: ActionResolvedPayload): string {
  return `${resolved.effectId}:${resolved.outcome}`;
}

/** `${playerId}:${turnSequence}:${reason}` (V2). */
export function eliminationBeatKey(entry: PlayerEliminatedLogEntry): string {
  return `${entry.playerId}:${String(entry.turnSequence)}:${entry.reason}`;
}

/** Q63: the seed a mount starts from — every elimination already in the log. */
export function eliminationBeatKeys(log: readonly ActionLogEntryView[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const entry of log) {
    if (entry.kind === 'playerEliminated') {
      keys.add(eliminationBeatKey(entry));
    }
  }
  return keys;
}

export interface NewEliminationBeats {
  readonly playerIds: readonly string[];
  readonly seen: ReadonlySet<string>;
}

/** Eliminations not in `seen`, in log order, each key once; `seen` plus their keys. */
export function newEliminationBeats(
  seen: ReadonlySet<string>,
  log: readonly ActionLogEntryView[],
): NewEliminationBeats {
  const next = new Set(seen);
  const playerIds: string[] = [];
  for (const entry of log) {
    if (entry.kind !== 'playerEliminated') {
      continue;
    }
    const key = eliminationBeatKey(entry);
    if (next.has(key)) {
      continue;
    }
    next.add(key);
    playerIds.push(entry.playerId);
  }
  return { playerIds, seen: next };
}

export interface UnseenLogEntries {
  readonly entries: readonly ActionLogEntryView[];
  readonly seen: ReadonlySet<string>;
}

/** Entries whose `actionLogFlyoutKey` is not in `seen`, first occurrence only, in log order. */
export function unseenLogEntries(
  seen: ReadonlySet<string>,
  log: readonly ActionLogEntryView[],
): UnseenLogEntries {
  const next = new Set(seen);
  const entries: ActionLogEntryView[] = [];
  for (const entry of log) {
    const key = actionLogFlyoutKey(entry);
    if (next.has(key)) {
      continue;
    }
    next.add(key);
    entries.push(entry);
  }
  return { entries, seen: next };
}

export type LogFxStep =
  | { readonly kind: 'chips'; readonly chips: readonly DirectedTokenChip[] }
  | { readonly kind: 'deck-ghost'; readonly ghost: DeckCardGhost }
  | { readonly kind: 'play-ghost'; readonly ghost: DeckCardGhost };

export interface LogFxInput {
  readonly entries: readonly ActionLogEntryView[];
  readonly prev: ReadonlyMap<string, OpponentLiveResources>;
  readonly next: ReadonlyMap<string, OpponentLiveResources>;
  readonly you: string;
  readonly players: readonly PublicPlayerView[];
  readonly selfKitId: KitId;
}

/** The V2 table's per-entry choreography, in its order, then the leftover live legs; empty chip lists are dropped. */
export function logFxPlan(input: LogFxInput): readonly LogFxStep[] {
  const { entries, prev, next, you, players, selfKitId } = input;
  const steps: LogFxStep[] = [];
  const pointYields = new Map<string, number>();
  const accounted: DirectedTokenChip[] = [];
  const pushChips = (chips: readonly DirectedTokenChip[]): void => {
    accounted.push(...chips);
    // Enqueueing an empty list was a no-op in V2.
    if (chips.length > 0) {
      steps.push({ kind: 'chips', chips });
    }
  };
  for (const entry of entries) {
    const steal = stealTransferChips(entry, prev, next);
    pushChips(boostStealChipsWithRecentYield(entry, steal.chips, pointYields));
    const regenActor =
      entry.kind === 'actionPlayed' && entry.action === 'playCard' ? entry.actorPlayerId : null;
    if (regenActor !== null && (!prev.has(regenActor) || !next.has(regenActor))) {
      pushChips(regenFlowChips(entry, prev, next).chips);
    }
    const chips = chipsForPublicLogEntry(entry, you, players, selfKitId);
    pushChips(chips);
    for (const chip of chips) {
      if (chip.to !== 'log' && chip.kind === 'point') {
        pointYields.set(chip.to.playerId, chip.count);
      }
    }
    const ghost = deckCardGhostForPublicLogEntry(entry, you, players);
    if (ghost !== null) {
      steps.push({ kind: 'deck-ghost', ghost });
    }
    for (const playGhost of playCardGhostsForPublicLogEntry(entry, you)) {
      steps.push({ kind: 'play-ghost', ghost: playGhost });
    }
  }
  pushChips(leftoverLiveFlowChips(accounted, prev, next));
  return steps;
}

export type OwnIntentFx =
  | { readonly kind: 'play'; readonly instanceId: string; readonly origin?: Point }
  | { readonly kind: 'multi-attack'; readonly instanceIds: readonly string[] }
  | { readonly kind: 'buy-card'; readonly cardId: CardId }
  | { readonly kind: 'buy-special' }
  | { readonly kind: 'sell'; readonly instanceId: string; readonly origin?: Point };

export type OwnFxStep =
  | { readonly kind: 'play-ghost'; readonly instanceId: string; readonly artUrl: string; readonly origin?: Point }
  | { readonly kind: 'buy-card-flyout'; readonly cardId: CardId }
  | { readonly kind: 'buy-special-flyout' }
  | {
      readonly kind: 'sell-flyout';
      readonly instanceId: string;
      readonly cardId: CardId;
      readonly isUpgraded: boolean;
      readonly origin?: Point;
    };

interface HeldCards {
  readonly hand: readonly CardInstance[];
  readonly specialCards: readonly CardInstance[];
}

function findHeld(held: HeldCards, instanceId: string): CardInstance | undefined {
  return (
    held.hand.find((card) => card.instanceId === instanceId) ??
    held.specialCards.find((card) => card.instanceId === instanceId)
  );
}

/**
 * The card's face, else the family verso (V2 `table.tsx` play wrappers). A verso that itself
 * throws skips the ghost: the V2 table would have thrown after the send.
 */
function ghostArtUrl(card: CardInstance, verso: CardBackKind): string | null {
  try {
    return getCardArtUrl(card.cardId, { isUpgraded: card.isUpgraded });
  } catch {
    try {
      return getCardBackUrl(verso);
    } catch {
      return null;
    }
  }
}

function playGhostStep(card: CardInstance, verso: CardBackKind, origin: Point | undefined): OwnFxStep[] {
  const artUrl = ghostArtUrl(card, verso);
  if (artUrl === null) {
    return [];
  }
  return [{ kind: 'play-ghost', instanceId: card.instanceId, artUrl, ...(origin !== undefined ? { origin } : {}) }];
}

/** Held cards are looked up in hand then specials; a card no longer held flies nothing (V2 `findOwnCard`). */
export function ownIntentFxSteps(fx: OwnIntentFx, held: HeldCards): readonly OwnFxStep[] {
  switch (fx.kind) {
    case 'play': {
      const card = findHeld(held, fx.instanceId);
      return card === undefined ? [] : playGhostStep(card, 'action', fx.origin);
    }
    case 'multi-attack':
      return fx.instanceIds.flatMap((instanceId) => {
        const card = findHeld(held, instanceId);
        return card === undefined ? [] : playGhostStep(card, 'attack', undefined);
      });
    case 'buy-card':
      return [{ kind: 'buy-card-flyout', cardId: fx.cardId }];
    case 'buy-special':
      return [{ kind: 'buy-special-flyout' }];
    case 'sell': {
      const card = findHeld(held, fx.instanceId);
      if (card === undefined) {
        return [];
      }
      return [
        {
          kind: 'sell-flyout',
          instanceId: fx.instanceId,
          cardId: card.cardId,
          isUpgraded: card.isUpgraded,
          ...(fx.origin !== undefined ? { origin: fx.origin } : {}),
        },
      ];
    }
  }
}
