/**
 * Wire-view builders for the Lot 73 view-model tests — imported by tests only, never by shipped
 * code. Defaults are the Lot 73 plan contract (Appendix A): you `me`, game `TEST`, Kamikaze with
 * 10 lives, players `me` / `p1` / `p2`. Every builder spreads `overrides` last, so a test names
 * only what it asserts on. Later Lot 73 tasks append builders and never change these defaults.
 */

import type {
  CardId,
  CardInstance,
  EliminationRevealView,
  PendingEffectView,
  PersistentEffectView,
  PlayingStateView,
  PrivateSelfView,
  PublicPlayerView,
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
