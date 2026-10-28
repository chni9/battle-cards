/**
 * Wire-view builders for the Lot 73 view-model tests — imported by tests only, never by shipped
 * code. Defaults are the Lot 73 plan contract (Appendix A): you `me`, game `TEST`, Kamikaze with
 * 10 lives, players `me` / `p1` / `p2`. Every builder spreads `overrides` last, so a test names
 * only what it asserts on. Later Lot 73 tasks append builders and never change these defaults.
 */

import {
  defaultLobbyRules,
  type CardId,
  type CardInstance,
  type EliminationRevealView,
  type FinishedStateView,
  type LobbyRules,
  type LobbyStateView,
  type PendingEffectView,
  type PersistentEffectView,
  type PlayingStateView,
  type PrivateSelfView,
  type PublicPlayerView,
} from '@card-battle/shared';

export function makeCard(cardId: CardId, overrides?: Partial<CardInstance>): CardInstance {
  return { instanceId: `${cardId}-1`, cardId, isUpgraded: false, ...overrides };
}

export function makePlayer(id: string, overrides?: Partial<PublicPlayerView>): PublicPlayerView {
  return {
    id,
    nickname: id,
    isEliminated: false,
    isYou: false,
    isBot: false,
    connection: {
      status: 'connected',
      disconnectedAt: null,
      automaticTurnsTaken: 0,
      consecutiveTimeouts: 0,
    },
    activePersistentEffects: [],
    activeShield: null,
    blockTurnsRemaining: 0,
    blockAttacksForbidden: false,
    activeAttackBlock: null,
    duplicationActive: false,
    pendingReanimation: null,
    absorbWindowOpen: false,
    ...overrides,
  };
}

export function makeSelf(overrides?: Partial<PrivateSelfView>): PrivateSelfView {
  return {
    kitId: 'kamikaze',
    lives: 10,
    shield: 0,
    shieldIsUpgraded: false,
    points: 0,
    upgradePoints: 0,
    hand: [],
    specialCards: [],
    activePersistentEffects: [],
    attackBlockCharges: 0,
    ...overrides,
  };
}

export function makePlayingView(overrides?: Partial<PlayingStateView>): PlayingStateView {
  return {
    phase: 'playing',
    you: 'me',
    gameCode: 'TEST',
    currentTurnPlayerId: 'me',
    turnSequence: 1,
    turnOrder: ['me', 'p1', 'p2'],
    turnDeadlineMs: null,
    players: [makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2')],
    self: makeSelf(),
    pendingEffects: [],
    actionLog: [],
    pool: [],
    poolBuyCost: 1,
    pendingSentences: [],
    playKind: 'classic',
    tutorialIndex: null,
    ...overrides,
  };
}

export function makePending(
  input: Pick<PendingEffectView, 'id' | 'sourcePlayerId' | 'targetPlayerId' | 'cardId'> &
    Partial<PendingEffectView>,
): PendingEffectView {
  return { isUpgraded: false, queuedAt: 1, damageMultiplier: 1, redirectedBy: null, ...input };
}

export function makePersistent(
  input: Pick<PersistentEffectView, 'id' | 'cardId'> & Partial<PersistentEffectView>,
): PersistentEffectView {
  return { isUpgraded: false, counter: null, targetPlayerId: null, ...input };
}

/** Death freeze (Lot 19): Kamikaze, no cards, every token 0, shield not upgraded, turn 1. */
export function makeEliminationReveal(
  overrides?: Partial<EliminationRevealView>,
): EliminationRevealView {
  return {
    kitId: 'kamikaze',
    hand: [],
    specialCards: [],
    lives: 0,
    points: 0,
    upgradePoints: 0,
    shield: 0,
    shieldIsUpgraded: false,
    turnSequence: 1,
    ...overrides,
  };
}

/**
 * A table of `ids` in turn order. The seat `overrides.you ?? 'me'` is the POV (`isYou`); a
 * walk-in passes `{ you: 'watcher', isSpectator: true }`, which leaves every seat a non-POV
 * seat. L73-03.
 */
export function makeTableView(
  ids: readonly string[],
  overrides?: Partial<PlayingStateView>,
): PlayingStateView {
  const you = overrides?.you ?? 'me';
  return makePlayingView({
    turnOrder: [...ids],
    players: ids.map((id) => makePlayer(id, { isYou: id === you })),
    ...overrides,
  });
}

export type LobbyViewOverrides = Partial<Omit<LobbyStateView, 'lobbyRules'>> & {
  lobbyRules?: LobbyRules | null;
};

/**
 * A one-seat lobby view whose `lobbyRules` are the defaults. `lobbyRules: null` omits the field
 * (`exactOptionalPropertyTypes` forbids `undefined`). L73-12.
 */
export function makeLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  const { lobbyRules = defaultLobbyRules(), ...rest } = overrides;
  return {
    phase: 'lobby',
    you: 'me',
    gameCode: 'TEST',
    hostPlayerId: 'me',
    players: [{ id: 'me', nickname: 'me', isBot: false, isReady: true }],
    yourKitSelection: 'random',
    ...rest,
    ...(lobbyRules === null ? {} : { lobbyRules }),
  };
}

export type FinishedViewOverrides = Partial<Omit<FinishedStateView, 'lobbyRules'>> & {
  lobbyRules?: LobbyRules | null;
};

/**
 * A finished view over `finalTable` (default `makePlayingView()`): `gameCode`, `players`,
 * `playKind` and `tutorialIndex` are copied from it, as on the wire. `lobbyRules: null` omits
 * the field, the wire shape of a tutorial finish. L73-12.
 */
export function makeFinishedView(overrides: FinishedViewOverrides = {}): FinishedStateView {
  const { lobbyRules = defaultLobbyRules(), ...rest } = overrides;
  const finalTable = rest.finalTable ?? makePlayingView();
  return {
    phase: 'finished',
    you: 'me',
    gameCode: finalTable.gameCode,
    winnerPlayerId: 'me',
    players: finalTable.players,
    recap: { turnSequence: finalTable.turnSequence, players: [], eliminations: [] },
    exportLog: { turns: [], events: [] },
    finalTable,
    playKind: finalTable.playKind,
    tutorialIndex: finalTable.tutorialIndex,
    ...rest,
    ...(lobbyRules === null ? {} : { lobbyRules }),
  };
}
