import { describe, expect, it } from 'vitest';

import type { ActionLogEntryKind, ActionLogEntryView } from '@card-battle/shared';

import {
  ACTION_LOG_KINDS,
  filterActionLog,
  formatActionLogEntry,
  formatActionLogEntrySegments,
  groupByRound,
  groupByTurn,
  resourceDeltaClass,
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
      'Alice attacks Bob with Basic attack (1)',
    );
    expect(formatActionLogEntry(resolved, nick)).toBe(
      "Alice's Basic attack hits Bob",
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

  it('names a recovered pool card only when cardId is present (L63-06)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'buyPoolCard',
          cardId: 'tax',
          isUpgraded: false,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice bought Tax from the pool');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'buyPoolCard',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice bought a card from the pool');
  });

  it('logs that the actor got unspied from the spy (L58-07)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'clearSpy',
          targetPlayerId: 'b',
          turnSequence: 4,
        },
        nick,
      ),
    ).toBe('Alice got unspied from Bob');
  });

  it('does not invent equal-cancel vs stronger-prevails copy (L43-03)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-cancel',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'cancelled',
          turnSequence: 2,
        },
        nick,
      ),
    ).toBe("Basic attack from Alice against Bob is cancelled");
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-cancel',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'cancelled',
          turnSequence: 2,
        },
        nick,
      ),
    ).not.toMatch(/equal|stronger|prevail/i);
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
    ).toBe('Alice attacks Bob with Strong attack + (4)');
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
    ).toBe("Alice's Super attack + hits Bob");
  });

  it('formats deactivation and duplication activation (L30-06)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'deactivatePersistent',
          cardId: 'invisibility',
          isUpgraded: false,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice deactivated Invisibility; it is lost');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'activateDuplication',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice draws');
  });

  it('shows a public Draw-bust tell (L63-03)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'draw',
          drawBust: true,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice draws and busts');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'draw',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice draws');
  });

  it('logs a Draw-bust death as dies by Gambling (L64-04)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'playerEliminated',
          playerId: 'a',
          reason: 'gambling',
          eliminatorPlayerId: null,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice dies by Gambling');
    expect(
      formatActionLogEntry(
        {
          kind: 'playerEliminated',
          playerId: 'a',
          reason: 'combat',
          eliminatorPlayerId: null,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice is eliminated in combat');
  });

  it('formats player reanimation without the kit (L50-03)', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'playerReanimated',
          playerId: 'b',
          kitId: 'untouchable',
          turnSequence: 4,
        },
        nick,
      ),
    ).toBe('Bob returns');
  });

  it('formats player reanimation without kit when omitted', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'playerReanimated',
          playerId: 'b',
          turnSequence: 4,
        },
        nick,
      ),
    ).toBe('Bob returns');
  });

  it('spells out immunity when Spy or Thief fails', () => {
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
    ).toBe('Spy from Alice resolves on Bob — immune');
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
    ).toBe('Thief from Alice resolves on Bob — immune');
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
    ).toMatch(/immune/i);
  });

  it('formats blocked resolutions without applied phrasing', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-blocked',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'strong-attack',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'blocked',
          turnSequence: 5,
        },
        nick,
      ),
    ).toBe('Strong attack from Alice against Bob is blocked');
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-blocked',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'strong-attack',
          isUpgraded: false,
          livesLost: 0,
          shieldAbsorbed: 0,
          outcome: 'blocked',
          turnSequence: 5,
        },
        nick,
      ),
    ).not.toMatch(/hits|life/i);
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
    ).toBe('Alice attacks with MEGA ATTACK (20)');

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
    ).toBe("Alice's MEGA ATTACK hits Bob");
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
    ).not.toMatch(/life|absorbed by shield/);
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

describe('formatActionLogEntrySegments (L39-03)', () => {
  it('emits player segments by id so nickname substrings never collide', () => {
    const nickCollision = (id: string): string =>
      id === 'a' ? 'Ann' : id === 'b' ? 'Anna' : id;

    const play = sample[0];
    expect(play).toBeDefined();
    if (play === undefined) {
      return;
    }

    const segments = formatActionLogEntrySegments(play, nickCollision);
    expect(segments).toEqual([
      { type: 'player', playerId: 'a', nickname: 'Ann' },
      { type: 'text', text: ' attacks ' },
      { type: 'player', playerId: 'b', nickname: 'Anna' },
      { type: 'text', text: ' with ' },
      { type: 'card', cardId: 'basic-attack', isUpgraded: false },
      { type: 'damage', amount: 1 },
    ]);
    expect(formatActionLogEntry(play, nickCollision)).toBe(
      'Ann attacks Anna with Basic attack (1)',
    );
  });

  it('marks possessives on the player segment, not as text rewrite', () => {
    const resolved = sample[1];
    expect(resolved).toBeDefined();
    if (resolved === undefined) {
      return;
    }

    const segments = formatActionLogEntrySegments(resolved, nick);
    expect(segments[0]).toEqual({
      type: 'player',
      playerId: 'a',
      nickname: 'Alice',
      possessive: true,
    });
    expect(formatActionLogEntry(resolved, nick)).toBe(
      "Alice's Basic attack hits Bob",
    );
  });
});

describe('action log kinds (L56-03)', () => {
  it('lists every ActionLogEntryKind including persistentDeactivated', () => {
    const kinds: Record<ActionLogEntryKind, true> = {
      actionPlayed: true,
      actionResolved: true,
      playerEliminated: true,
      mirrorRedirected: true,
      persistentDeactivated: true,
      curseTransferred: true,
      playerReanimated: true,
      rewardsClaimed: true,
      sentenceCountdown: true,
      sentenceFired: true,
      resourceChange: true,
    };
    expect([...ACTION_LOG_KINDS].sort()).toEqual(Object.keys(kinds).sort());
  });

  it('formats persistentDeactivated as lost copy', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'persistentDeactivated',
          ownerPlayerId: 'a',
          cardId: 'poison',
          isUpgraded: false,
          turnSequence: 4,
        },
        nick,
      ),
    ).toBe("Alice's Poison is deactivated and lost");
  });
});

describe('listed attack damage on play and Mirror log (L56-04)', () => {
  it('shows MEGA catalog damage on the play line', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'playCard',
          cardId: 'mega-attack',
          isUpgraded: false,
          targetPlayerId: 'b',
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Alice attacks Bob with MEGA ATTACK (20)');
  });

  it('shows post-redirect listed damage on Mirror history', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'mirrorRedirected',
          actorPlayerId: 'a',
          cardId: 'super-attack',
          isUpgraded: false,
          damageMultiplier: 2,
          previousTargetPlayerId: 'a',
          newTargetPlayerId: 'b',
          turnSequence: 3,
        },
        nick,
      ),
    ).toBe('Alice redirects Super attack (14) from Alice to Bob');
    expect(
      formatActionLogEntry(
        {
          kind: 'mirrorRedirected',
          actorPlayerId: 'a',
          cardId: 'super-attack',
          isUpgraded: false,
          damageMultiplier: 4,
          previousTargetPlayerId: 'b',
          newTargetPlayerId: 'a',
          turnSequence: 4,
        },
        nick,
      ),
    ).toBe('Alice redirects Super attack (28) from Bob to Alice');
  });
});

describe('click-to-explain card segments (L56-05)', () => {
  it('emits a card segment on Absorber play', () => {
    const play = {
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'playCard',
      cardId: 'absorber',
      isUpgraded: false,
      targetPlayerId: 'b',
      turnSequence: 1,
    } as const;
    expect(formatActionLogEntrySegments(play, nick)).toContainEqual({
      type: 'card',
      cardId: 'absorber',
      isUpgraded: false,
    });
    expect(formatActionLogEntry(play, nick)).toBe('Alice plays Absorber on Bob');
  });

  it('does not emit a card segment for a fogged pool buy (L63-06)', () => {
    const fogged = {
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'buyPoolCard',
      turnSequence: 1,
    } as const;
    expect(formatActionLogEntrySegments(fogged, nick).some((segment) => segment.type === 'card')).toBe(
      false,
    );
  });

  it('emits a card segment on persistentDeactivated', () => {
    expect(
      formatActionLogEntrySegments(
        {
          kind: 'persistentDeactivated',
          ownerPlayerId: 'a',
          cardId: 'poison',
          isUpgraded: false,
          turnSequence: 4,
        },
        nick,
      ),
    ).toContainEqual({
      type: 'card',
      cardId: 'poison',
      isUpgraded: false,
    });
  });

  it('does not emit a card segment on draw or elimination', () => {
    const draw = formatActionLogEntrySegments(
      {
        kind: 'actionPlayed',
        actorPlayerId: 'a',
        action: 'draw',
        turnSequence: 1,
      },
      nick,
    );
    const elim = formatActionLogEntrySegments(
      {
        kind: 'playerEliminated',
        playerId: 'b',
        reason: 'combat',
        eliminatorPlayerId: 'a',
        turnSequence: 2,
      },
      nick,
    );
    expect(draw.some((segment) => segment.type === 'card')).toBe(false);
    expect(elim.some((segment) => segment.type === 'card')).toBe(false);
  });
});

describe('action log resource suffixes', () => {
  it('ends a basic attack with a red point loss and no parentheses', () => {
    const segments = formatActionLogEntrySegments(
      {
        kind: 'actionPlayed',
        actorPlayerId: 'a',
        action: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: false,
        targetPlayerId: 'b',
        turnSequence: 1,
        resourceDeltas: [{ kind: 'point', amount: -1 }],
      },
      nick,
    );
    const suffix = segments[segments.length - 1];
    expect(suffix).toEqual({
      type: 'resource',
      kind: 'point',
      direction: 'loss',
      label: '\u22121',
      spoken: '\u22121 point',
    });
    expect(suffix?.type === 'resource' ? resourceDeltaClass(suffix.direction) : '').toBe(
      'text-cta-red',
    );
    const line = formatActionLogEntry(
      {
        kind: 'actionPlayed',
        actorPlayerId: 'a',
        action: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: false,
        targetPlayerId: 'b',
        turnSequence: 1,
        resourceDeltas: [{ kind: 'point', amount: -1 }],
      },
      nick,
    );
    expect(line.endsWith(' \u22121')).toBe(true);
    expect(line).not.toMatch(/\(\u22121|\(-1\)/);
  });

  it('colors a gain green and shows both resources on a sell', () => {
    const gain = formatActionLogEntrySegments(
      {
        kind: 'actionPlayed',
        actorPlayerId: 'a',
        action: 'draw',
        turnSequence: 1,
        resourceDeltas: [{ kind: 'point', amount: 4 }],
      },
      nick,
    ).at(-1);
    expect(gain).toMatchObject({
      type: 'resource',
      direction: 'gain',
      label: '+4',
      kind: 'point',
    });
    expect(gain?.type === 'resource' ? resourceDeltaClass(gain.direction) : '').toBe(
      'text-cta-green',
    );

    const sell = formatActionLogEntrySegments(
      {
        kind: 'actionPlayed',
        actorPlayerId: 'a',
        action: 'sellUpgradePoint',
        turnSequence: 2,
        resourceDeltas: [
          { kind: 'point', amount: 7 },
          { kind: 'upgradePoint', amount: -1 },
        ],
      },
      nick,
    );
    expect(sell.filter((segment) => segment.type === 'resource')).toEqual([
      {
        type: 'resource',
        kind: 'point',
        direction: 'gain',
        label: '+7',
        spoken: '+7 points',
      },
      {
        type: 'resource',
        kind: 'upgradePoint',
        direction: 'loss',
        label: '\u22121',
        spoken: '\u22121 upgrade point',
      },
    ]);
  });

  it('formats a persistent tick as a name plus icons and leaves rewards opaque', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'resourceChange',
          playerId: 'a',
          turnSequence: 3,
          deltas: [{ kind: 'point', amount: 3 }],
        },
        nick,
      ),
    ).toBe('Alice +3');
    expect(
      formatActionLogEntry(
        {
          kind: 'rewardsClaimed',
          eliminatorPlayerId: 'a',
          eliminatedPlayerId: 'b',
          turnSequence: 4,
        },
        nick,
      ),
    ).not.toMatch(/\+|\u2212|life|point/i);
  });

  it('shows a concealed Draw as a green +?', () => {
    const concealed = formatActionLogEntrySegments(
      {
        kind: 'actionPlayed',
        actorPlayerId: 'a',
        action: 'draw',
        turnSequence: 1,
        resourceDeltas: [{ kind: 'point', concealed: true, direction: 'gain' }],
      },
      nick,
    ).at(-1);
    expect(concealed).toMatchObject({
      type: 'resource',
      kind: 'point',
      direction: 'gain',
      label: '+?',
    });
    expect(concealed?.type === 'resource' ? resourceDeltaClass(concealed.direction) : '').toBe(
      'text-cta-green',
    );
  });

  it('shows resolve-time life loss on the target and both sides of a steal', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e-hit',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 1,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 2,
          playerDeltas: [{ playerId: 'b', deltas: [{ kind: 'life', amount: -1 }] }],
        },
        nick,
      ),
    ).toBe("Alice's Basic attack hits Bob \u22121");

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
          outcome: 'applied',
          turnSequence: 4,
          playerDeltas: [
            { playerId: 'b', deltas: [{ kind: 'point', amount: -5 }] },
            { playerId: 'a', deltas: [{ kind: 'point', amount: 5 }] },
          ],
        },
        nick,
      ),
    ).toBe('Thief from Alice resolves on Bob \u22125 Alice +5');
  });
});
