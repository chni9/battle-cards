/**
 * Kit posterior from scripted public logs — backlog L34-02 (designer A uniqueness).
 * Synthetic views only; no engine.
 */

import { describe, expect, it } from 'vitest';

import {
  KIT_IDS,
  type ActionLogEntryView,
  type ActionPlayedLogEntry,
  type ActionResolvedLogEntry,
  type KitId,
  type PlayingStateView,
  type PrivateSelfView,
  type PublicConnectionView,
  type PublicPlayerView,
  type SpiedPlayerView,
} from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import {
  isUniquenessGuaranteedKit,
  kitsOwningSpecial,
  UNIQUENESS_GUARANTEED_KIT_IDS,
} from './kit-uniqueness';
import { kitPosteriorForOpponent, sampleKit } from './kit-posterior';
import type { KitPosterior } from './types';

const CONNECTED: PublicConnectionView = {
  status: 'connected',
  disconnectedAt: null,
  automaticTurnsTaken: 0,
  consecutiveTimeouts: 0,
};

const SELF_ID = 'me';
const OPP_ID = 'opp';

function baseSelf(): PrivateSelfView {
  return {
    lives: 10,
    shield: 0,
    shieldIsUpgraded: false,
    points: 0,
    upgradePoints: 0,
    kitId: 'assassin',
    hand: [],
    specialCards: [],
    activePersistentEffects: [],
    attackBlockCharges: 0,
  };
}

function player(
  id: string,
  isYou: boolean,
  extras: Partial<PublicPlayerView> = {},
): PublicPlayerView {
  return {
    id,
    nickname: id,
    isEliminated: false,
    isYou,
    isBot: false,
    connection: CONNECTED,
    activePersistentEffects: [],
    activeShield: null,
    blockTurnsRemaining: 0,
    blockAttacksForbidden: false,
    activeAttackBlock: null,
    duplicationActive: false,
    pendingReanimation: null,
    absorbWindowOpen: false,
    ...extras,
  };
}

function view(extras: Partial<PlayingStateView> = {}): PlayingStateView {
  return {
    phase: 'playing',
    you: SELF_ID,
    gameCode: 'L34-02',
    currentTurnPlayerId: SELF_ID,
    turnSequence: 3,
    turnOrder: [SELF_ID, OPP_ID],
    turnDeadlineMs: null,
    players: [player(SELF_ID, true), player(OPP_ID, false)],
    self: baseSelf(),
    pendingEffects: [],
    actionLog: [],
    pool: [],
    ...extras,
  };
}

function play(
  action: ActionPlayedLogEntry['action'],
  fields: Omit<Partial<ActionPlayedLogEntry>, 'kind' | 'actorPlayerId' | 'action' | 'turnSequence'> & {
    actorPlayerId?: string;
    turnSequence?: number;
  } = {},
): ActionPlayedLogEntry {
  const { actorPlayerId, turnSequence, ...rest } = fields;
  return {
    kind: 'actionPlayed',
    actorPlayerId: actorPlayerId ?? OPP_ID,
    action,
    turnSequence: turnSequence ?? 1,
    ...rest,
  };
}

function resolved(
  fields: Pick<ActionResolvedLogEntry, 'cardId' | 'outcome'> &
    Partial<Omit<ActionResolvedLogEntry, 'kind' | 'cardId' | 'outcome'>>,
): ActionResolvedLogEntry {
  return {
    kind: 'actionResolved',
    effectId: fields.effectId ?? 'e1',
    sourcePlayerId: fields.sourcePlayerId ?? SELF_ID,
    targetPlayerId: fields.targetPlayerId ?? OPP_ID,
    cardId: fields.cardId,
    isUpgraded: fields.isUpgraded ?? false,
    livesLost: fields.livesLost ?? 0,
    shieldAbsorbed: fields.shieldAbsorbed ?? 0,
    outcome: fields.outcome,
    turnSequence: fields.turnSequence ?? 2,
  };
}

function posterior(log: readonly ActionLogEntryView[], playing = view()): KitPosterior {
  return kitPosteriorForOpponent(OPP_ID, playing, log);
}

function support(post: KitPosterior): KitId[] {
  return KIT_IDS.filter((kitId) => post[kitId] > 0);
}

function sum(post: KitPosterior): number {
  return KIT_IDS.reduce((acc, kitId) => acc + post[kitId], 0);
}

describe('kit uniqueness table (L34-02)', () => {
  it('treats unique special owners as uniqueness-guaranteed and Prophet as not', () => {
    expect(kitsOwningSpecial('suicide')).toEqual(['kamikaze']);
    expect(kitsOwningSpecial('imposition')).toEqual(['untouchable', 'duplicator']);
    expect(kitsOwningSpecial('invisibility')).toEqual([]);
    expect(isUniquenessGuaranteedKit('kamikaze')).toBe(true);
    expect(isUniquenessGuaranteedKit('assassin')).toBe(true);
    expect(isUniquenessGuaranteedKit('untouchable')).toBe(true);
    expect(isUniquenessGuaranteedKit('duplicator')).toBe(true);
    expect(isUniquenessGuaranteedKit('prophet')).toBe(false);
    expect(UNIQUENESS_GUARANTEED_KIT_IDS).not.toContain('prophet');
    expect(UNIQUENESS_GUARANTEED_KIT_IDS).toHaveLength(14);
  });
});

describe('kitPosteriorForOpponent (L34-02)', () => {
  it('collapses to kamikaze after a unique suicide play', () => {
    const post = posterior([play('playCard', { cardId: 'suicide' })]);
    expect(sum(post)).toBeCloseTo(1, 10);
    expect(post.kamikaze).toBeGreaterThan(0.9);
    expect(post.prophet).toBeGreaterThan(0);
    expect(post.prophet).toBeLessThan(0.1);
    expect(post.assassin).toBe(0);
    expect(post.duplicator).toBe(0);
  });

  it('collapses to assassin after playMultipleAttacks', () => {
    const post = posterior([
      play('playMultipleAttacks', {
        attacks: [
          { cardId: 'basic-attack', targetPlayerId: SELF_ID, isUpgraded: false },
          { cardId: 'strong-attack', targetPlayerId: SELF_ID, isUpgraded: false },
        ],
      }),
    ]);
    expect(post.assassin).toBeCloseTo(1, 10);
    expect(support(post)).toEqual(['assassin']);
  });

  it('collapses to untouchable after thief immune resolve', () => {
    const post = posterior([resolved({ cardId: 'thief', outcome: 'immune' })]);
    expect(post.untouchable).toBeCloseTo(1, 10);
    expect(support(post)).toEqual(['untouchable']);
  });

  it('does not force a single kit from imposition alone', () => {
    const post = posterior([play('playCard', { cardId: 'imposition' })]);
    expect(post.untouchable).toBeGreaterThan(0);
    expect(post.duplicator).toBeGreaterThan(0);
    expect(post.prophet).toBeGreaterThan(0);
    expect(post.duplicator).toBeGreaterThan(0.4);
    expect(support(post).length).toBeGreaterThan(1);
    expect(post.kamikaze).toBe(0);
  });

  it('keeps kamikaze and prophet after a kamikaze special with no buySpecial', () => {
    const post = posterior([play('playCard', { cardId: 'suicide' })]);
    expect(post.kamikaze).toBeGreaterThan(0);
    expect(post.prophet).toBeGreaterThan(0);
    expect(support(post).sort()).toEqual(['kamikaze', 'prophet']);
  });

  it('assigns zero to kamikaze after an assassin multi-attack tell', () => {
    const post = posterior([
      play('playMultipleAttacks', {
        attacks: [
          { cardId: 'basic-attack', targetPlayerId: SELF_ID, isUpgraded: false },
          { cardId: 'basic-attack', targetPlayerId: SELF_ID, isUpgraded: false },
        ],
      }),
    ]);
    expect(post.kamikaze).toBe(0);
    expect(post.assassin).toBe(1);
  });

  it('forces a point mass from a Spy-revealed kitId', () => {
    const spied: SpiedPlayerView = {
      kitId: 'witch',
      hand: [],
      specialCards: [],
    };
    const playing = view({
      players: [player(SELF_ID, true), player(OPP_ID, false, { spied })],
    });
    const post = posterior([play('playCard', { cardId: 'suicide' })], playing);
    expect(post.witch).toBe(1);
    expect(support(post)).toEqual(['witch']);
  });

  it('does not zero kits on immune for a card no kit lists in immuneTo', () => {
    const post = posterior([resolved({ cardId: 'basic-attack', outcome: 'immune' })]);
    expect(post.kamikaze).toBeCloseTo(1 / 15, 10);
    expect(post.untouchable).toBeCloseTo(1 / 15, 10);
    expect(support(post)).toHaveLength(15);
  });

  it('zeros kits without alwaysUpgraded when an upgraded shop attack is free', () => {
    const post = posterior([
      play('playCard', { cardId: 'basic-attack', isUpgraded: true }),
    ]);
    expect(post.warrior).toBeCloseTo(1, 10);
    expect(support(post)).toEqual(['warrior']);
  });

  it('does not use the alwaysUpgraded tell after a public upgrade spend', () => {
    const post = posterior([
      play('upgradeCard', { cardId: 'basic-attack', turnSequence: 1 }),
      play('playCard', { cardId: 'basic-attack', isUpgraded: true, turnSequence: 2 }),
    ]);
    expect(post.warrior).toBeCloseTo(1 / 15, 10);
    expect(support(post)).toHaveLength(15);
  });

  it('sampleKit draws only from positive-mass kits', () => {
    const post = posterior([play('playCard', { cardId: 'suicide' })]);
    const rng = createRng('l34-02-sample');

    for (let index = 0; index < 40; index += 1) {
      const kitId = sampleKit(post, rng);
      expect(post[kitId]).toBeGreaterThan(0);
    }
  });
});
