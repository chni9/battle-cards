/**
 * Public-log token chips — L51-09 / L51-11.
 * Live upgraded Spy / death numbers fly via ResourceIcon except steal transfers.
 * POV dock ResourceIcon handles own Δ. Unspied / base Spy: catalog + public log.
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
  opponentHasLiveResourceIcons,
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

export interface SellCardGhost {
  playerId: string;
  artUrl: string;
}

export type LiveResourceSnap = OpponentLiveResources;

const POINT_STEAL_CARD_IDS: ReadonlySet<CardId> = new Set<CardId>([
  'thief',
  'spy-thief',
  'upgrade-point-thief',
]);

const STEAL_RESOURCE_KINDS: readonly ResourceKind[] = ['point', 'upgradePoint'];

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

function shouldSkipActor(
  actorId: string,
  you: string,
  players: readonly PublicPlayerView[],
): boolean {
  if (actorId === you) {
    return true;
  }
  const actor = playerById(players, actorId);
  return actor === undefined || opponentHasLiveResourceIcons(actor);
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
): DirectedTokenChip[] {
  if (entry.kind === 'actionResolved') {
    if (entry.targetPlayerId === you) {
      return [];
    }
    const target = playerById(players, entry.targetPlayerId);
    if (target === undefined || opponentHasLiveResourceIcons(target)) {
      return [];
    }
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

  if (shouldSkipActor(entry.actorPlayerId, you, players)) {
    return [];
  }

  const actor = playerById(players, entry.actorPlayerId);
  if (actor === undefined) {
    return [];
  }
  const actorId = entry.actorPlayerId;

  switch (entry.action) {
    case 'draw': {
      if (!opponentKitIsVisible(actor)) {
        return [];
      }
      const kitId = visibleKitId(actor);
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
    case 'deactivatePersistent':
    case 'activateDuplication':
      return [];
    default: {
      const _exhaustive: never = entry.action;
      return _exhaustive;
    }
  }
}

export function sellCardGhostForPublicLogEntry(
  entry: ActionLogEntryView,
  you: string,
  players: readonly PublicPlayerView[],
): SellCardGhost | null {
  if (entry.kind !== 'actionPlayed' || entry.action !== 'sellCard') {
    return null;
  }
  if (entry.actorPlayerId === you) {
    return null;
  }
  const actor = playerById(players, entry.actorPlayerId);
  if (actor === undefined) {
    return null;
  }
  const cardId = entry.cardId;
  if (opponentKitIsVisible(actor) && cardId !== undefined) {
    return {
      playerId: entry.actorPlayerId,
      artUrl: getCardArtUrl(cardId, { isUpgraded: entry.isUpgraded === true }),
    };
  }
  return {
    playerId: entry.actorPlayerId,
    artUrl: getCardBackUrl('action'),
  };
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

export interface StealTransferResult {
  chips: DirectedTokenChip[];
  skips: readonly { playerId: string; kind: ResourceKind }[];
}

/**
 * Seat-to-seat steal chips from live resource Δ only. Never invents an amount
 * when both seats are `?` (L51-11). Extra upgraded gain flies log → thief.
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
