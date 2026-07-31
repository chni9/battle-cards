import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView } from '@card-battle/shared';

import {
  filterActionLog,
  formatActionLogEntry,
  groupByTurn,
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

    expect(formatActionLogEntry(play, nick)).toBe('Alice: playCard basic-attack → Bob');
    expect(formatActionLogEntry(resolved, nick)).toContain('Resolved:');
    expect(formatActionLogEntry(rewards, nick)).toBe(
      'Alice claimed elimination rewards (Bob)',
    );
    expect(formatActionLogEntry(rewards, nick)).not.toMatch(/lives|points|card/i);
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

  it('groups consecutive entries by turnSequence', () => {
    const groups = groupByTurn(sample);

    expect(groups).toEqual([
      { turnSequence: 1, entries: [sample[0]] },
      { turnSequence: 2, entries: [sample[1], sample[2]] },
    ]);
  });
});
