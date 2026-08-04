/**
 * Full private player snapshots for the finished-game Excel export — Lot 19.
 * Never attached to playing views.
 */

import {
  isAttackCardId,
  type ExportPlayerParamsView,
  type ExportTurnRowView,
  type GameState,
} from '@card-battle/shared';

export function snapshotPlayersForExport(state: GameState): ExportPlayerParamsView[] {
  return state.players.map((player) => ({
    playerId: player.id,
    nickname: player.nickname,
    kitId: player.kitId,
    lives: player.lives,
    points: player.points,
    upgradePoints: player.upgradePoints,
    shield: player.shield,
    shieldIsUpgraded: player.shieldIsUpgraded,
    isEliminated: player.isEliminated,
    hand: player.hand.map((card) => ({ ...card })),
    specialCards: player.specialCards.map((card) => ({ ...card })),
    pendingAttacks: player.pendingEffects.flatMap((effect) => {
      if (!isAttackCardId(effect.cardId)) {
        return [];
      }

      return [
        {
          cardId: effect.cardId,
          isUpgraded: effect.isUpgraded,
          sourcePlayerId: effect.sourcePlayerId,
          targetPlayerId: effect.targetPlayerId,
          damageMultiplier: effect.damageMultiplier,
          redirectedBy: effect.redirectedBy,
        },
      ];
    }),
  }));
}

export function buildExportTurnRow(input: {
  turnSequence: number;
  actorPlayerId: string;
  action: ExportTurnRowView['action'];
  cardId?: ExportTurnRowView['cardId'];
  isUpgraded?: boolean;
  targetPlayerId?: string;
  attacks?: ExportTurnRowView['attacks'];
  before: readonly ExportPlayerParamsView[];
  after: readonly ExportPlayerParamsView[];
}): ExportTurnRowView {
  const row: ExportTurnRowView = {
    turnSequence: input.turnSequence,
    actorPlayerId: input.actorPlayerId,
    action: input.action,
    before: input.before.map(clonePlayerParams),
    after: input.after.map(clonePlayerParams),
  };

  if (input.cardId !== undefined) {
    row.cardId = input.cardId;
  }

  if (input.isUpgraded !== undefined) {
    row.isUpgraded = input.isUpgraded;
  }

  if (input.targetPlayerId !== undefined) {
    row.targetPlayerId = input.targetPlayerId;
  }

  if (input.attacks !== undefined) {
    row.attacks = input.attacks.map((attack) => ({ ...attack }));
  }

  return row;
}

function clonePlayerParams(entry: ExportPlayerParamsView): ExportPlayerParamsView {
  return {
    ...entry,
    hand: entry.hand.map((card) => ({ ...card })),
    specialCards: entry.specialCards.map((card) => ({ ...card })),
    pendingAttacks: entry.pendingAttacks.map((attack) => ({ ...attack })),
  };
}
