/**
 * Opponent public-log token chips — L51-09 / L51-11.
 */

import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView, PublicPlayerView } from '@card-battle/shared';
import { UPGRADE_POINT_ECONOMY } from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl } from '../design/asset-lookup';
import {
  chipsForPublicLogEntry,
  deckCardGhostForPublicLogEntry,
  regenFlowChips,
  stealTransferChips,
} from './opponent-token-chips';

function opponent(partial: Partial<PublicPlayerView> & Pick<PublicPlayerView, 'id'>): PublicPlayerView {
  return {
    nickname: partial.id,
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
    ...partial,
  };
}

const you = opponent({ id: 'me', isYou: true });
const hidden = opponent({ id: 'opp' });
const spied = opponent({
  id: 'spy',
  spied: {
    kitId: 'scientific',
    hand: [],
    specialCards: [],
    resourcesSnapshot: {
      lives: 10,
      points: 4,
      upgradePoints: 1,
      shield: 0,
      turnSequence: 1,
    },
  },
});
const live = opponent({
  id: 'live',
  spied: {
    kitId: 'scientific',
    hand: [],
    specialCards: [],
    lives: 8,
    points: 3,
    upgradePoints: 1,
    shield: 0,
  },
});

describe('opponent public-log token chips (L51-09 / L51-11)', () => {
  it('skips Draw when kit Draw is hidden, and draws toward the seat when visible', () => {
    const entry: ActionLogEntryView = {
      kind: 'actionPlayed',
      actorPlayerId: 'opp',
      action: 'draw',
      turnSequence: 2,
    };
    expect(chipsForPublicLogEntry(entry, 'me', [you, hidden])).toEqual([]);
    expect(chipsForPublicLogEntry(entry, 'me', [you, { ...spied, id: 'opp' }])).toEqual([
      { kind: 'point', count: 1, from: 'log', to: { playerId: 'opp' } },
    ]);
  });

  it('uses catalog play cost as a seat→log spend for unspied seats', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'opp',
          action: 'playCard',
          cardId: 'basic-attack',
          isUpgraded: false,
          turnSequence: 3,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([
      { kind: 'point', count: 1, from: { playerId: 'opp' }, to: 'log' },
    ]);

    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e1',
          sourcePlayerId: 'opp',
          targetPlayerId: 'opp',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 2,
          shieldAbsorbed: 1,
          outcome: 'applied',
          turnSequence: 4,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([
      { kind: 'life', count: 2, from: { playerId: 'opp' }, to: 'log' },
      { kind: 'shield', count: 1, from: { playerId: 'opp' }, to: 'log' },
    ]);
  });

  it('does not invent chips for live Spy seats', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'live',
          action: 'upgradeCard',
          cardId: 'spy',
          turnSequence: 6,
        },
        'me',
        [you, live],
      ),
    ).toEqual([]);
  });

  it('flies POV catalog spends so Shop-covered ResourceIcon is not the only path', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'me',
          action: 'buyUpgradePoint',
          turnSequence: 5,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([
      {
        kind: 'point',
        count: UPGRADE_POINT_ECONOMY.buyCostPoints,
        from: { playerId: 'me' },
        to: 'log',
      },
      { kind: 'upgradePoint', count: 1, from: 'log', to: { playerId: 'me' } },
    ]);
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'me',
          action: 'playCard',
          cardId: 'tax',
          turnSequence: 5,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([{ kind: 'life', count: 1, from: { playerId: 'me' }, to: 'log' }]);
  });

  it('flies Regeneration live Δ when known, else the catalog unit (L51-13)', () => {
    const play: ActionLogEntryView = {
      kind: 'actionPlayed',
      actorPlayerId: 'opp',
      action: 'playCard',
      cardId: 'regeneration',
      isUpgraded: true,
      turnSequence: 7,
    };
    expect(chipsForPublicLogEntry(play, 'me', [you, hidden])).toEqual([]);
    expect(regenFlowChips(play, new Map(), new Map()).chips).toEqual([
      { kind: 'point', count: 2, from: { playerId: 'opp' }, to: 'log' },
      { kind: 'life', count: 1, from: 'log', to: { playerId: 'opp' } },
    ]);
    const prev = new Map([['opp', { lives: 10, points: 12, upgradePoints: 0, shield: 0 }]]);
    const next = new Map([['opp', { lives: 13, points: 6, upgradePoints: 0, shield: 0 }]]);
    expect(regenFlowChips(play, prev, next).chips).toEqual([
      { kind: 'point', count: 6, from: { playerId: 'opp' }, to: 'log' },
      { kind: 'life', count: 3, from: 'log', to: { playerId: 'opp' } },
    ]);
  });

  it('sells as a log→seat gain, not a seat→log spend', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'opp',
          action: 'sellCard',
          cardId: 'basic-attack',
          turnSequence: 8,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([
      { kind: 'point', count: 1, from: 'log', to: { playerId: 'opp' } },
    ]);
  });

  it('buys an upgrade point with the Classic 10-point spend when kit is hidden', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'opp',
          action: 'buyUpgradePoint',
          turnSequence: 9,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([
      {
        kind: 'point',
        count: UPGRADE_POINT_ECONOMY.buyCostPoints,
        from: { playerId: 'opp' },
        to: 'log',
      },
      { kind: 'upgradePoint', count: 1, from: 'log', to: { playerId: 'opp' } },
    ]);
  });

  it('flies a buy/sell card verso when unspied and the face when Spyed', () => {
    const sell: ActionLogEntryView = {
      kind: 'actionPlayed',
      actorPlayerId: 'opp',
      action: 'sellCard',
      cardId: 'thief',
      isUpgraded: false,
      turnSequence: 10,
    };
    expect(deckCardGhostForPublicLogEntry(sell, 'me', [you, hidden])).toEqual({
      playerId: 'opp',
      artUrl: getCardBackUrl('action'),
      direction: 'sell',
    });
    expect(
      deckCardGhostForPublicLogEntry(sell, 'me', [you, { ...spied, id: 'opp' }]),
    ).toEqual({
      playerId: 'opp',
      artUrl: getCardArtUrl('thief', { isUpgraded: false }),
      direction: 'sell',
    });
    const buy: ActionLogEntryView = {
      kind: 'actionPlayed',
      actorPlayerId: 'opp',
      action: 'buyCard',
      cardId: 'basic-attack',
      turnSequence: 10,
    };
    expect(deckCardGhostForPublicLogEntry(buy, 'me', [you, hidden])).toEqual({
      playerId: 'opp',
      artUrl: getCardBackUrl('action'),
      direction: 'buy',
    });
    const hiddenId: ActionLogEntryView = {
      kind: 'actionPlayed',
      actorPlayerId: 'opp',
      action: 'sellCard',
      turnSequence: 10,
    };
    expect(deckCardGhostForPublicLogEntry(hiddenId, 'me', [you, hidden])).toEqual({
      playerId: 'opp',
      artUrl: getCardBackUrl('action'),
      direction: 'sell',
    });
    expect(
      deckCardGhostForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'me',
          action: 'sellCard',
          cardId: 'thief',
          turnSequence: 10,
        },
        'me',
        [you, hidden],
      ),
    ).toBeNull();
  });

  it('pairs live thief deltas victim→thief and does not invent an unspied amount', () => {
    const entry: ActionLogEntryView = {
      kind: 'actionResolved',
      effectId: 'thief-1',
      sourcePlayerId: 'thief',
      targetPlayerId: 'victim',
      cardId: 'thief',
      isUpgraded: false,
      livesLost: 0,
      shieldAbsorbed: 0,
      outcome: 'applied',
      turnSequence: 11,
    };
    const prev = new Map([
      ['victim', { lives: 10, points: 8, upgradePoints: 0, shield: 0 }],
      ['thief', { lives: 12, points: 2, upgradePoints: 1, shield: 0 }],
    ]);
    const next = new Map([
      ['victim', { lives: 10, points: 0, upgradePoints: 0, shield: 0 }],
      ['thief', { lives: 12, points: 10, upgradePoints: 1, shield: 0 }],
    ]);
    expect(stealTransferChips(entry, prev, next)).toEqual({
      chips: [
        {
          kind: 'point',
          count: 8,
          from: { playerId: 'victim' },
          to: { playerId: 'thief' },
        },
      ],
      skips: [
        { playerId: 'victim', kind: 'point' },
        { playerId: 'thief', kind: 'point' },
      ],
    });
    expect(stealTransferChips(entry, new Map(), new Map())).toEqual({
      chips: [
        {
          kind: 'point',
          count: 1,
          from: { playerId: 'victim' },
          to: { playerId: 'thief' },
        },
      ],
      skips: [],
    });
    expect(
      chipsForPublicLogEntry(entry, 'me', [you, hidden, opponent({ id: 'thief' })]),
    ).toEqual([]);
  });

  it('sends upgraded-thief extra gain from the log, not from the victim', () => {
    const entry: ActionLogEntryView = {
      kind: 'actionResolved',
      effectId: 'thief-2',
      sourcePlayerId: 'thief',
      targetPlayerId: 'victim',
      cardId: 'thief',
      isUpgraded: true,
      livesLost: 0,
      shieldAbsorbed: 0,
      outcome: 'applied',
      turnSequence: 12,
    };
    const prev = new Map([
      ['victim', { lives: 10, points: 10, upgradePoints: 0, shield: 0 }],
      ['thief', { lives: 12, points: 0, upgradePoints: 0, shield: 0 }],
    ]);
    const next = new Map([
      ['victim', { lives: 10, points: 0, upgradePoints: 0, shield: 0 }],
      ['thief', { lives: 12, points: 20, upgradePoints: 0, shield: 0 }],
    ]);
    expect(stealTransferChips(entry, prev, next).chips).toEqual([
      {
        kind: 'point',
        count: 10,
        from: { playerId: 'victim' },
        to: { playerId: 'thief' },
      },
      { kind: 'point', count: 10, from: 'log', to: { playerId: 'thief' } },
    ]);
  });
});
