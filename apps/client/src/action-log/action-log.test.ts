import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView } from '@card-battle/shared';

import {
  filterActionLog,
  formatActionLogEntry,
  groupByRound,
  groupByTurn,
  roundOfTurn,
} from './action-log';

const nick = (id: string): string => (id === 'a' ? 'Alice' : id === 'b' ? 'Bob' : id);

const sample: ActionLogEntryView[] = [
  {
    kind: 'actionPlayed',
    actorPlayerId: 'a',
    action: 'playCard',
    cardId: 'basic-attack',
    targetPlayerId: 'b',
    turnSequence: 1,
  },
  {
    kind: 'actionResolved',
    effectId: 'e1',
    sourcePlayerId: 'a',
    targetPlayerId: 'b',
    cardId: 'basic-attack',
    isUpgraded: false,
    livesLost: 1,
    shieldAbsorbed: 0,
    outcome: 'applied',
    turnSequence: 2,
  },
  {
    kind: 'rewardsClaimed',
    eliminatorPlayerId: 'a',
    eliminatedPlayerId: 'b',
    turnSequence: 2,
  },
];

describe('formatActionLogEntry (L9-02)', () => {
  it('formats plays, resolutions, and opaque reward claims', () => {
    const play = sample[0];
    const resolved = sample[1];
    const rewards = sample[2];

    expect(play).toBeDefined();
    expect(resolved).toBeDefined();
    expect(rewards).toBeDefined();

    if (play === undefined || resolved === undefined || rewards === undefined) {
      return;
    }

    expect(formatActionLogEntry(play, nick)).toBe(
      'Alice attacks Bob with Basic attack',
    );
    expect(formatActionLogEntry(resolved, nick)).toBe(
      "Alice's Basic attack hits Bob (−1 life)",
    );
    expect(formatActionLogEntry(rewards, nick)).toBe(
      'Alice claims elimination rewards from Bob',
    );
    expect(formatActionLogEntry(rewards, nick)).not.toMatch(/lives|points/i);
  });

  it('omits card names for buy, sell, and upgrade', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'sellCard',
          cardId: 'basic-attack',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice sold a card');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'upgradeCard',
          cardId: 'spy',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice upgraded a card');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'buyCard',
          cardId: 'shield',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice bought a card');
  });

  it('marks upgraded cards with a + suffix', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'playCard',
          cardId: 'strong-attack',
          isUpgraded: true,
          targetPlayerId: 'b',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice attacks Bob with Strong attack +');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e2',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'super-attack',
          isUpgraded: true,
          livesLost: 10,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 2,
        },
        nick,
      ),
    ).toBe("Alice's Super attack + hits Bob (−10 life)");
  });

  it('does not spell out immunity when Spy or Thief fails', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-spy',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'spy',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'immune',
          turnSequence: 3,
        },
        nick,
      ),
    ).toBe('Spy from Alice resolves on Bob');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-thief',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'thief',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'immune',
          turnSequence: 4,
        },
        nick,
      ),
    ).toBe('Thief from Alice resolves on Bob');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-spy',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'spy',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'immune',
          turnSequence: 3,
        },
        nick,
      ),
    ).not.toMatch(/immune/i);
  });
});

describe('filterActionLog / groupByTurn (L9-02)', () => {
  it('filters by kind, player, and query', () => {
    const filtered = filterActionLog(
      sample,
      {
        playerId: 'b',
        kinds: new Set(['actionPlayed']),
        query: 'basic',
      },
      nick,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kind).toBe('actionPlayed');
  });

  it('shows nothing when no kinds are selected', () => {
    const filtered = filterActionLog(
      sample,
      { playerId: null, kinds: new Set(), query: '' },
      nick,
    );

    expect(filtered).toHaveLength(0);
  });

  it('phrases MEGA ATTACK as an attack, including full shield absorb (L20-05)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'playCard',
          cardId: 'mega-attack',
          isUpgraded: false,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice attacks with MEGA ATTACK');

    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-mega',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'mega-attack',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 20,
          outcome: 'applied',
          turnSequence: 2,
        },
        nick,
      ),
    ).toBe("Alice's MEGA ATTACK hits Bob (−0 life, 20 absorbed by shield)");
  });

  it('groups consecutive entries by turnSequence', () => {
    const groups = groupByTurn(sample);

    expect(groups).toEqual([
      { turnSequence: 1, entries: [sample[0]] },
      { turnSequence: 2, entries: [sample[1], sample[2]] },
    ]);
  });

  it('groups by table round from seat count (no turn numbers in grouping key)', () => {
    expect(roundOfTurn(0, 2)).toBe(1);
    expect(roundOfTurn(1, 2)).toBe(1);
    expect(roundOfTurn(2, 2)).toBe(2);

    const groups = groupByRound(sample, 2);

    expect(groups).toEqual([
      { round: 1, entries: [sample[0]] },
      { round: 2, entries: [sample[1], sample[2]] },
    ]);
  });
});
