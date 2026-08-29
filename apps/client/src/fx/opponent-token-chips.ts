/**
 * Public-log token chips — L51-09 / L51-11 / L51-13 / L51-15 / L51-16.
 * Catalog + public `livesLost` cover the known legs of a transaction.
 * `leftoverLiveFlowChips` flies the other leg when live numbers disagree
 * with that catalog net (spend 3 + absorb 10 → both directions).
 * Unspied seats never invent Draw / absorb totals. Regen quantity is never
 * invented: live Δ, else the catalog per-life unit.
 * Play-card ghosts: public `cardId` face, seat → felt center (not the log).
 */

import {
  getCard,
  getKit,
  UPGRADE_POINT_ECONOMY,
  upgradePointBuyCost,
  upgradePointSellYield,
  type ActionLogEntryView,
  type CardCost,
  type CardId,
  type KitId,
  type PublicPlayerView,
} from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl, type ResourceKind } from '../design/asset-lookup';
import { structuredPlayCost } from '../design/components/structured-cost';
import {
  opponentKitIsVisible,
  type OpponentLiveResources,
} from '../screens/table/opponent-seat-resources';
import type { TokenFlyoutEndpoint } from './table-fx-types';

export interface DirectedTokenChip {
  kind: ResourceKind;
  count: number;
  from: TokenFlyoutEndpoint;
  to: TokenFlyoutEndpoint;
}

export interface DeckCardGhost {
  playerId: string;
  artUrl: string;
  direction: 'buy' | 'sell';
}

export type LiveResourceSnap = OpponentLiveResources;

const POINT_STEAL_CARD_IDS: ReadonlySet<CardId> = new Set<CardId>([
  'thief',
  'spy-thief',
  'upgrade-point-thief',
]);

const STEAL_RESOURCE_KINDS: readonly ResourceKind[] = ['point', 'upgradePoint'];

const LIVE_RESOURCE_KINDS: readonly ResourceKind[] = [
  'life',
  'point',
  'upgradePoint',
  'shield',
];

/** Random special purchase — rules spec §5. Shop chrome uses the same amount. */
const SPECIAL_CARD_PURCHASE_POINTS = 20;

function playerById(
  players: readonly PublicPlayerView[],
  id: string,
): PublicPlayerView | undefined {
  return players.find((player) => player.id === id);
}

function visibleKitId(player: PublicPlayerView): KitId | undefined {
  return player.eliminationReveal?.kitId ?? player.spied?.kitId;
}

function pushChip(
  chips: DirectedTokenChip[],
  chip: DirectedTokenChip,
): void {
  if (chip.count > 0) {
    chips.push(chip);
  }
}

function lossChips(
  playerId: string,
  cost: CardCost | undefined,
): DirectedTokenChip[] {
  if (cost === undefined) {
    return [];
  }
  if (cost.pointsPerLife !== undefined && cost.pointsPerLife > 0) {
    return [];
  }
  const chips: DirectedTokenChip[] = [];
  if (cost.points !== undefined && cost.points > 0) {
    pushChip(chips, {
      kind: 'point',
      count: cost.points,
      from: { playerId },
      to: 'log',
    });
  }
  if (cost.lives !== undefined && cost.lives > 0) {
    pushChip(chips, {
      kind: 'life',
      count: cost.lives,
      from: { playerId },
      to: 'log',
    });
  }
  return chips;
}

function yieldChips(
  playerId: string,
  cost: CardCost | undefined,
): DirectedTokenChip[] {
  if (cost === undefined) {
    return [];
  }
  if (cost.pointsPerLife !== undefined && cost.pointsPerLife > 0) {
    return [];
  }
  const chips: DirectedTokenChip[] = [];
  if (cost.points !== undefined && cost.points > 0) {
    pushChip(chips, {
      kind: 'point',
      count: cost.points,
      from: 'log',
      to: { playerId },
    });
  }
  if (cost.lives !== undefined && cost.lives > 0) {
    pushChip(chips, {
      kind: 'life',
      count: cost.lives,
      from: 'log',
      to: { playerId },
    });
  }
  return chips;
}

function upgradeBuyCost(actor: PublicPlayerView): number {
  const kitId = visibleKitId(actor);
  return kitId === undefined
    ? UPGRADE_POINT_ECONOMY.buyCostPoints
    : upgradePointBuyCost(kitId);
}

function upgradeSellYield(actor: PublicPlayerView): number {
  const kitId = visibleKitId(actor);
  return kitId === undefined
    ? UPGRADE_POINT_ECONOMY.sellYieldPoints
    : upgradePointSellYield(kitId);
}

export function chipsForPublicLogEntry(
  entry: ActionLogEntryView,
  you: string,
  players: readonly PublicPlayerView[],
  selfKitId: KitId,
): DirectedTokenChip[] {
  if (entry.kind === 'actionResolved') {
    if (isStealResolve(entry)) {
      return [];
    }
    const chips: DirectedTokenChip[] = [];
    pushChip(chips, {
      kind: 'life',
      count: entry.livesLost,
      from: { playerId: entry.targetPlayerId },
      to: 'log',
    });
    pushChip(chips, {
      kind: 'shield',
      count: entry.shieldAbsorbed,
      from: { playerId: entry.targetPlayerId },
      to: 'log',
    });
    return chips;
  }

  if (entry.kind !== 'actionPlayed') {
    return [];
  }

  const actor = playerById(players, entry.actorPlayerId);
  if (actor === undefined) {
    return [];
  }
  const actorId = entry.actorPlayerId;

  switch (entry.action) {
    case 'draw': {
      const kitId = actorId === you ? selfKitId : visibleKitId(actor);
      if (kitId === undefined) {
        return [];
      }
      const count = getKit(kitId).startingResources.draw;
      if (count <= 0) {
        return [];
      }
      const chip: DirectedTokenChip = {
        kind: 'point',
        count,
        from: 'log',
        to: { playerId: actorId },
      };
      return [chip];
    }
    case 'playCard': {
      if (entry.cardId === undefined) {
        return [];
      }
      const card = getCard(entry.cardId);
      if (card === undefined) {
        return [];
      }
      const play = structuredPlayCost(card, entry.isUpgraded === true);
      if (play === null || play.kind === 'pointsPerLife') {
        // Quantity is not on the public log — regenFlowChips owns this action.
        return [];
      }
      if (play.kind === 'points') {
        return [{ kind: 'point', count: play.amount, from: { playerId: actorId }, to: 'log' }];
      }
      if (play.kind === 'lives') {
        return [{ kind: 'life', count: play.amount, from: { playerId: actorId }, to: 'log' }];
      }
      return [
        { kind: 'upgradePoint', count: play.amount, from: { playerId: actorId }, to: 'log' },
      ];
    }
    case 'playMultipleAttacks': {
      const chips: DirectedTokenChip[] = [];
      for (const attack of entry.attacks ?? []) {
        const card = getCard(attack.cardId);
        if (card === undefined) {
          continue;
        }
        chips.push(...lossChips(actorId, card.cost));
      }
      return chips;
    }
    case 'buyCard':
      return entry.cardId === undefined
        ? []
        : lossChips(actorId, getCard(entry.cardId)?.buyCost);
    case 'sellCard':
      return entry.cardId === undefined
        ? []
        : yieldChips(actorId, getCard(entry.cardId)?.sellYield);
    case 'upgradeCard':
      return [
        {
          kind: 'upgradePoint',
          count: 1,
          from: { playerId: actorId },
          to: 'log',
        },
      ];
    case 'buyUpgradePoint':
      return [
        {
          kind: 'point',
          count: upgradeBuyCost(actor),
          from: { playerId: actorId },
          to: 'log',
        },
        {
          kind: 'upgradePoint',
          count: 1,
          from: 'log',
          to: { playerId: actorId },
        },
      ];
    case 'sellUpgradePoint':
      return [
        {
          kind: 'upgradePoint',
          count: 1,
          from: { playerId: actorId },
          to: 'log',
        },
        {
          kind: 'point',
          count: upgradeSellYield(actor),
          from: 'log',
          to: { playerId: actorId },
        },
      ];
    case 'buySpecialCard':
      return [
        {
          kind: 'point',
          count: SPECIAL_CARD_PURCHASE_POINTS,
          from: { playerId: actorId },
          to: 'log',
        },
      ];
    case 'deactivatePersistent':
    case 'activateDuplication':
      return [];
    default: {
      const _exhaustive: never = entry.action;
      return _exhaustive;
    }
  }
}

export function deckCardGhostForPublicLogEntry(
  entry: ActionLogEntryView,
  you: string,
  players: readonly PublicPlayerView[],
): DeckCardGhost | null {
  if (entry.kind !== 'actionPlayed') {
    return null;
  }
  if (entry.actorPlayerId === you) {
    return null;
  }
  const direction =
    entry.action === 'sellCard'
      ? 'sell'
      : entry.action === 'buyCard' || entry.action === 'buySpecialCard'
        ? 'buy'
        : null;
  if (direction === null) {
    return null;
  }
  const actor = playerById(players, entry.actorPlayerId);
  if (actor === undefined) {
    return null;
  }
  const cardId = entry.cardId;
  try {
    if (entry.action === 'buySpecialCard') {
      return {
        playerId: entry.actorPlayerId,
        artUrl: getCardBackUrl('special'),
        direction,
      };
    }
    if (opponentKitIsVisible(actor) && cardId !== undefined) {
      return {
        playerId: entry.actorPlayerId,
        artUrl: getCardArtUrl(cardId, { isUpgraded: entry.isUpgraded === true }),
        direction,
      };
    }
    return {
      playerId: entry.actorPlayerId,
      artUrl: getCardBackUrl('action'),
      direction,
    };
  } catch {
    try {
      return {
        playerId: entry.actorPlayerId,
        artUrl: getCardBackUrl(entry.action === 'buySpecialCard' ? 'special' : 'action'),
        direction,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Played-card ghosts for everyone except POV (POV measures the hand instance).
 * Card identity is public on the log — face art, never a verso guess (L51-16).
 */
export function playCardGhostsForPublicLogEntry(
  entry: ActionLogEntryView,
  you: string,
): DeckCardGhost[] {
  if (entry.kind !== 'actionPlayed' || entry.actorPlayerId === you) {
    return [];
  }
  const ghosts: DeckCardGhost[] = [];
  const pushFace = (cardId: CardId, isUpgraded: boolean): void => {
    try {
      ghosts.push({
        playerId: entry.actorPlayerId,
        artUrl: getCardArtUrl(cardId, { isUpgraded }),
        direction: 'sell',
      });
    } catch {
      try {
        ghosts.push({
          playerId: entry.actorPlayerId,
          artUrl: getCardBackUrl('action'),
          direction: 'sell',
        });
      } catch {
        // Art missing — skip rather than invent a transfer.
      }
    }
  };
  if (entry.action === 'playCard' && entry.cardId !== undefined) {
    pushFace(entry.cardId, entry.isUpgraded === true);
    return ghosts;
  }
  if (entry.action === 'playMultipleAttacks') {
    for (const attack of entry.attacks ?? []) {
      pushFace(attack.cardId, attack.isUpgraded);
    }
  }
  return ghosts;
}

export function isStealResolve(entry: ActionLogEntryView): boolean {
  return (
    entry.kind === 'actionResolved' &&
    entry.outcome === 'applied' &&
    POINT_STEAL_CARD_IDS.has(entry.cardId)
  );
}

function snapField(snap: LiveResourceSnap, kind: ResourceKind): number {
  switch (kind) {
    case 'life':
      return snap.lives;
    case 'point':
      return snap.points;
    case 'upgradePoint':
      return snap.upgradePoints;
    case 'shield':
      return snap.shield;
  }
}

function chipNetForSeat(
  chips: readonly DirectedTokenChip[],
  playerId: string,
  kind: ResourceKind,
): number {
  let net = 0;
  for (const chip of chips) {
    if (chip.kind !== kind) {
      continue;
    }
    if (chip.from !== 'log' && chip.from.playerId === playerId) {
      net -= chip.count;
    }
    if (chip.to !== 'log' && chip.to.playerId === playerId) {
      net += chip.count;
    }
  }
  return net;
}

/**
 * Live Δ that catalog / steal chips did not already explain (L51-15).
 * Spend 3 + absorb 10 nets +7: catalog flies the 3, this flies the 10.
 * Spy reveal (no previous snap) is not a transaction — skip.
 */
export function leftoverLiveFlowChips(
  accounted: readonly DirectedTokenChip[],
  prev: ReadonlyMap<string, LiveResourceSnap>,
  next: ReadonlyMap<string, LiveResourceSnap>,
): DirectedTokenChip[] {
  const chips: DirectedTokenChip[] = [];
  for (const [playerId, nextSnap] of next) {
    const prevSnap = prev.get(playerId);
    if (prevSnap === undefined) {
      continue;
    }
    for (const kind of LIVE_RESOURCE_KINDS) {
      const liveDelta = snapField(nextSnap, kind) - snapField(prevSnap, kind);
      const unexplained = liveDelta - chipNetForSeat(accounted, playerId, kind);
      if (unexplained > 0) {
        pushChip(chips, {
          kind,
          count: unexplained,
          from: 'log',
          to: { playerId },
        });
      } else if (unexplained < 0) {
        pushChip(chips, {
          kind,
          count: -unexplained,
          from: { playerId },
          to: 'log',
        });
      }
    }
  }
  return chips;
}

export interface StealTransferResult {
  chips: DirectedTokenChip[];
  skips: readonly { playerId: string; kind: ResourceKind }[];
}

/**
 * Seat-to-seat steal chips from live resource Δ. When both seats are `?`,
 * one directional chip shows victim→thief without claiming a total (L51-13).
 * Extra upgraded gain flies log → thief.
 */
export function stealTransferChips(
  entry: ActionLogEntryView,
  prev: ReadonlyMap<string, LiveResourceSnap>,
  next: ReadonlyMap<string, LiveResourceSnap>,
): StealTransferResult {
  if (entry.kind !== 'actionResolved' || !isStealResolve(entry)) {
    return { chips: [], skips: [] };
  }

  const victimId = entry.targetPlayerId;
  const thiefId = entry.sourcePlayerId;
  const chips: DirectedTokenChip[] = [];
  const skips: { playerId: string; kind: ResourceKind }[] = [];

  for (const kind of STEAL_RESOURCE_KINDS) {
    const victimPrev = prev.get(victimId);
    const victimNext = next.get(victimId);
    const thiefPrev = prev.get(thiefId);
    const thiefNext = next.get(thiefId);
    const victimDelta =
      victimPrev !== undefined && victimNext !== undefined
        ? snapField(victimNext, kind) - snapField(victimPrev, kind)
        : null;
    const thiefDelta =
      thiefPrev !== undefined && thiefNext !== undefined
        ? snapField(thiefNext, kind) - snapField(thiefPrev, kind)
        : null;
    const victimLoss = victimDelta !== null && victimDelta < 0 ? -victimDelta : null;
    const thiefGain = thiefDelta !== null && thiefDelta > 0 ? thiefDelta : null;

    if (victimLoss === null && thiefGain === null) {
      continue;
    }

    if (victimLoss !== null && thiefGain !== null) {
      const shared = Math.min(victimLoss, thiefGain);
      pushChip(chips, {
        kind,
        count: shared,
        from: { playerId: victimId },
        to: { playerId: thiefId },
      });
      if (thiefGain > shared) {
        pushChip(chips, {
          kind,
          count: thiefGain - shared,
          from: 'log',
          to: { playerId: thiefId },
        });
      }
      if (victimLoss > shared) {
        pushChip(chips, {
          kind,
          count: victimLoss - shared,
          from: { playerId: victimId },
          to: 'log',
        });
      }
      skips.push({ playerId: victimId, kind }, { playerId: thiefId, kind });
      continue;
    }

    if (victimLoss !== null) {
      pushChip(chips, {
        kind,
        count: victimLoss,
        from: { playerId: victimId },
        to: { playerId: thiefId },
      });
      skips.push({ playerId: victimId, kind });
      continue;
    }

    if (thiefGain !== null) {
      pushChip(chips, {
        kind,
        count: thiefGain,
        from: { playerId: victimId },
        to: { playerId: thiefId },
      });
      skips.push({ playerId: thiefId, kind });
    }
  }

  if (chips.length === 0) {
    // Both seats `?`: public log has no steal total. One directional chip is a
    // transfer beat, not a claimed amount (L51-13).
    const kind: ResourceKind =
      entry.cardId === 'upgrade-point-thief' ? 'upgradePoint' : 'point';
    pushChip(chips, {
      kind,
      count: 1,
      from: { playerId: victimId },
      to: { playerId: thiefId },
    });
  }

  return { chips, skips };
}

/**
 * Same-tick sell+steal nets to 0 live Δ, which would hide the transfer.
 * If a public-log point yield just landed on the victim, use that count
 * instead of the 1-chip fallback (L51-13).
 */
export function boostStealChipsWithRecentYield(
  entry: ActionLogEntryView,
  chips: readonly DirectedTokenChip[],
  pointYields: ReadonlyMap<string, number>,
): DirectedTokenChip[] {
  if (entry.kind !== 'actionResolved' || !isStealResolve(entry)) {
    return [...chips];
  }
  const first = chips[0];
  if (
    first === undefined ||
    chips.length !== 1 ||
    first.count !== 1 ||
    first.kind !== 'point'
  ) {
    return [...chips];
  }
  const hinted = pointYields.get(entry.targetPlayerId);
  if (hinted === undefined || hinted <= 1) {
    return [...chips];
  }
  return [{ ...first, count: hinted }];
}

/**
 * Regeneration spends points and grants lives on play (rules spec §3).
 * Live Δ when the actor's numbers are on the view; otherwise the catalog
 * per-life unit (rate + 1 life) so the action still animates without inventing
 * the chosen quantity (L51-13).
 */
export function regenFlowChips(
  entry: ActionLogEntryView,
  prev: ReadonlyMap<string, LiveResourceSnap>,
  next: ReadonlyMap<string, LiveResourceSnap>,
): StealTransferResult {
  if (
    entry.kind !== 'actionPlayed' ||
    entry.action !== 'playCard' ||
    entry.cardId !== 'regeneration'
  ) {
    return { chips: [], skips: [] };
  }

  const actorId = entry.actorPlayerId;
  const chips: DirectedTokenChip[] = [];
  const skips: { playerId: string; kind: ResourceKind }[] = [];
  const actorPrev = prev.get(actorId);
  const actorNext = next.get(actorId);

  if (actorPrev !== undefined && actorNext !== undefined) {
    const pointLoss = actorPrev.points - actorNext.points;
    const lifeGain = actorNext.lives - actorPrev.lives;
    if (pointLoss > 0) {
      pushChip(chips, {
        kind: 'point',
        count: pointLoss,
        from: { playerId: actorId },
        to: 'log',
      });
      skips.push({ playerId: actorId, kind: 'point' });
    }
    if (lifeGain > 0) {
      pushChip(chips, {
        kind: 'life',
        count: lifeGain,
        from: 'log',
        to: { playerId: actorId },
      });
      skips.push({ playerId: actorId, kind: 'life' });
    }
    if (chips.length > 0) {
      return { chips, skips };
    }
  }

  const card = getCard('regeneration');
  if (card === undefined) {
    return { chips: [], skips: [] };
  }
  const play = structuredPlayCost(card, entry.isUpgraded === true);
  const rate = play?.kind === 'pointsPerLife' ? play.amount : 0;
  if (rate > 0) {
    pushChip(chips, {
      kind: 'point',
      count: rate,
      from: { playerId: actorId },
      to: 'log',
    });
    pushChip(chips, {
      kind: 'life',
      count: 1,
      from: 'log',
      to: { playerId: actorId },
    });
  }
  return { chips, skips };
}

export function actionLogFlyoutKey(entry: ActionLogEntryView): string {
  switch (entry.kind) {
    case 'actionPlayed':
      return `played:${String(entry.turnSequence)}:${entry.actorPlayerId}:${entry.action}:${entry.cardId ?? ''}`;
    case 'actionResolved':
      return `resolved:${entry.effectId}`;
    case 'playerEliminated':
      return `elim:${entry.playerId}:${String(entry.turnSequence)}`;
    case 'mirrorRedirected':
      return `mirror:${String(entry.turnSequence)}:${entry.actorPlayerId}:${entry.previousTargetPlayerId}`;
    case 'curseTransferred':
      return `curse:${entry.effectId}`;
    case 'playerReanimated':
      return `reanim:${entry.playerId}:${String(entry.turnSequence)}`;
    case 'rewardsClaimed':
      return `rewards:${entry.eliminatorPlayerId}:${entry.eliminatedPlayerId}:${String(entry.turnSequence)}`;
  }
}
