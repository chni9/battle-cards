/**
 * Public-log token chips for unspied / base Spy seats — L51-09.
 * Live upgraded Spy / death numbers fly via ResourceIcon. POV stays dock icons.
 */

import {
  getCard,
  getKit,
  upgradePointBuyCost,
  upgradePointSellYield,
  type ActionLogEntryView,
  type CardCost,
  type KitId,
  type PublicPlayerView,
} from '@card-battle/shared';

import type { ResourceKind } from '../design/asset-lookup';
import { structuredPlayCost } from '../design/components/structured-cost';
import {
  opponentHasLiveResourceIcons,
  opponentKitIsVisible,
} from '../screens/table/opponent-seat-resources';

export interface OpponentTokenChip {
  playerId: string;
  kind: ResourceKind;
  count: number;
}

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
  chips: OpponentTokenChip[],
  playerId: string,
  kind: ResourceKind,
  count: number,
): void {
  if (count > 0) {
    chips.push({ playerId, kind, count });
  }
}

function chipsFromCardCost(
  playerId: string,
  cost: CardCost | undefined,
): OpponentTokenChip[] {
  if (cost === undefined) {
    return [];
  }
  if (cost.pointsPerLife !== undefined && cost.pointsPerLife > 0) {
    return [];
  }
  const chips: OpponentTokenChip[] = [];
  if (cost.points !== undefined && cost.points > 0) {
    pushChip(chips, playerId, 'point', cost.points);
  }
  if (cost.lives !== undefined && cost.lives > 0) {
    pushChip(chips, playerId, 'life', cost.lives);
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

export function chipsForPublicLogEntry(
  entry: ActionLogEntryView,
  you: string,
  players: readonly PublicPlayerView[],
): OpponentTokenChip[] {
  if (entry.kind === 'actionResolved') {
    if (entry.targetPlayerId === you) {
      return [];
    }
    const target = playerById(players, entry.targetPlayerId);
    if (target === undefined || opponentHasLiveResourceIcons(target)) {
      return [];
    }
    const chips: OpponentTokenChip[] = [];
    pushChip(chips, entry.targetPlayerId, 'life', entry.livesLost);
    pushChip(chips, entry.targetPlayerId, 'shield', entry.shieldAbsorbed);
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
      return chipsFromCardCost(actorId, {
        points: getKit(kitId).startingResources.draw,
      });
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
        return [{ playerId: actorId, kind: 'point', count: play.amount }];
      }
      if (play.kind === 'lives') {
        return [{ playerId: actorId, kind: 'life', count: play.amount }];
      }
      return [{ playerId: actorId, kind: 'upgradePoint', count: play.amount }];
    }
    case 'playMultipleAttacks': {
      const chips: OpponentTokenChip[] = [];
      for (const attack of entry.attacks ?? []) {
        const card = getCard(attack.cardId);
        if (card === undefined) {
          continue;
        }
        chips.push(...chipsFromCardCost(actorId, card.cost));
      }
      return chips;
    }
    case 'buyCard':
      return entry.cardId === undefined
        ? []
        : chipsFromCardCost(actorId, getCard(entry.cardId)?.buyCost);
    case 'sellCard':
      return entry.cardId === undefined
        ? []
        : chipsFromCardCost(actorId, getCard(entry.cardId)?.sellYield);
    case 'upgradeCard':
      return [{ playerId: actorId, kind: 'upgradePoint', count: 1 }];
    case 'buyUpgradePoint': {
      const kitId = visibleKitId(actor);
      if (kitId === undefined) {
        return [];
      }
      return [
        { playerId: actorId, kind: 'point', count: upgradePointBuyCost(kitId) },
        { playerId: actorId, kind: 'upgradePoint', count: 1 },
      ];
    }
    case 'sellUpgradePoint': {
      const kitId = visibleKitId(actor);
      if (kitId === undefined) {
        return [];
      }
      return [
        { playerId: actorId, kind: 'upgradePoint', count: 1 },
        { playerId: actorId, kind: 'point', count: upgradePointSellYield(kitId) },
      ];
    }
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
