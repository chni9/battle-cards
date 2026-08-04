/**
 * Adapt a `PlayingStateView` into a synthetic `GameState` for `listLegalActions`.
 * Technical spec v3 §10.1 (L16-03): one enumerator, two inputs — real state vs view.
 *
 * Fabricates only what V1 `canPlay` / enumeration read. Opponent private fields are
 * stubs; if a future handler reads them, the §10.1 guard fails and needs a ruling.
 */

import {
  CLASSIC_LIFE_LIMIT,
  type GameState,
  type KitId,
  type Player,
  type PlayingStateView,
} from '@card-battle/shared';

const EMPTY_LEDGER = {
  livesLost: 0,
  pointsSpent: 0,
  upgradePointsSpent: 0,
  pointsLostToTheft: 0,
  upgradePointsLostToTheft: 0,
} as const;

const CONNECTED = {
  status: 'connected' as const,
  disconnectedAt: null,
  automaticTurnsTaken: 0,
  consecutiveTimeouts: 0,
};

/** Placeholder kit for unspied opponents — must not affect V1 legality. */
const STUB_KIT_ID: KitId = 'kamikaze';

export function enumerationStateFromView(
  view: PlayingStateView,
  seed: string,
): GameState {
  const players: Player[] = view.players.map((publicPlayer) => {
    if (publicPlayer.id === view.you) {
      return {
        id: publicPlayer.id,
        nickname: publicPlayer.nickname,
        kitId: view.self.kitId,
        lives: view.self.lives,
        points: view.self.points,
        upgradePoints: view.self.upgradePoints,
        shield: view.self.shield,
        shieldIsUpgraded: view.self.shieldIsUpgraded,
        hand: [...view.self.hand],
        specialCards: [...view.self.specialCards],
        pendingEffects: [],
        activePersistentEffects: view.self.activePersistentEffects.map((effect) => ({
          ...effect,
        })),
        turnLedger: { ...EMPTY_LEDGER },
        connectionState: { ...CONNECTED },
        isEliminated: publicPlayer.isEliminated,
        eliminationSnapshot: null,
      };
    }

    const spied = publicPlayer.spied;
    const kitId = spied?.kitId ?? STUB_KIT_ID;

    return {
      id: publicPlayer.id,
      nickname: publicPlayer.nickname,
      kitId,
      lives: spied?.lives ?? spied?.resourcesSnapshot?.lives ?? 1,
      points: spied?.points ?? spied?.resourcesSnapshot?.points ?? 0,
      upgradePoints: spied?.upgradePoints ?? spied?.resourcesSnapshot?.upgradePoints ?? 0,
      shield: spied?.shield ?? spied?.resourcesSnapshot?.shield ?? 0,
      shieldIsUpgraded: false,
      hand: spied !== undefined ? [...spied.hand] : [],
      specialCards: spied !== undefined ? [...spied.specialCards] : [],
      pendingEffects: [],
      activePersistentEffects: publicPlayer.activePersistentEffects.map((effect) => ({
        ...effect,
      })),
      turnLedger: { ...EMPTY_LEDGER },
      connectionState: { ...CONNECTED },
      isEliminated: publicPlayer.isEliminated,
      eliminationSnapshot: null,
    };
  });

  for (const effect of view.pendingEffects) {
    const target = players.find((player) => player.id === effect.targetPlayerId);

    if (target === undefined) {
      continue;
    }

    target.pendingEffects.push({
      id: effect.id,
      sourcePlayerId: effect.sourcePlayerId,
      targetPlayerId: effect.targetPlayerId,
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
      queuedAt: effect.queuedAt,
      damageMultiplier: effect.damageMultiplier,
    });
  }

  return {
    mode: 'classic',
    lifeLimit: CLASSIC_LIFE_LIMIT,
    players,
    pool: [],
    currentTurnPlayerId: view.currentTurnPlayerId,
    turnSequence: view.turnSequence,
    seed,
    visibility: [],
    mirrorChoice: null,
    eliminationContributors: [],
    rewardQueue: [],
    rewardChoice: null,
  };
}
