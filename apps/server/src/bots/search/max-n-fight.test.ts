/**
 * 3-player "let them fight" — L35-03 acceptance (max^n, not paranoid).
 *
 * Leaf values encode the designer's intended ranking: finishing the weak seat
 * while two opponents trade is worse for the acting seat than drawing / poking
 * the healthy seat. selectChild (max^n) must pick the better-for-self edge —
 * not the paranoid "finish the weak" edge.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../engine/create-initial-state';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { queueEffect } from '../../engine/turn/queue-effect';
import { selectChild } from './puct';
import type { SearchEdge, SearchNode } from './search-types';

function leaf(owner: string, values: readonly number[]): SearchNode {
  return {
    infoSetKey: `leaf:${values.join(',')}`,
    ownerPlayerId: owner,
    decisionKind: 'action',
    visits: 20,
    valueSums: Float64Array.from(values.map((value) => value * 20)),
    children: new Map(),
  };
}

describe('max^n let-them-fight (L35-03)', () => {
  it('scripted 3p crossfire: max^n does not select finish-the-weak', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l35-03-fight',
      kitAssignment: ['assassin', 'kamikaze', 'indestructible'],
    });

    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    expect(alice && bob && carol).toBeTruthy();

    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    bob.lives = 2;
    carol.lives = 12;
    alice.lives = 12;
    alice.points = 20;
    alice.hand = [
      { instanceId: 'finisher', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'pressure', cardId: 'basic-attack', isUpgraded: false },
    ];

    queueEffect({
      state,
      sourcePlayerId: 'c',
      targetPlayerId: 'b',
      cardId: 'super-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: 'b',
      targetPlayerId: 'c',
      cardId: 'super-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = 'a';

    const legal = listLegalActions(state, 'a');
    const finish = legal.find(
      (action) =>
        action.type === 'playCard' &&
        action.instanceId === 'finisher' &&
        action.targetPlayerId === 'b',
    );
    const poke = legal.find(
      (action) =>
        action.type === 'playCard' &&
        action.instanceId === 'pressure' &&
        action.targetPlayerId === 'c',
    );
    const draw = legal.find((action) => action.type === 'draw');

    expect(finish && poke && draw).toBeTruthy();

    if (finish === undefined || poke === undefined || draw === undefined) {
      return;
    }

    // Living order a,b,c. Finishing B helps C's endgame (paranoid lure);
    // drawing / poking C is better for a's own sole-survivor component.
    const children = new Map<string, SearchEdge>([
      [
        'finish-b',
        {
          decisionKey: 'finish-b',
          decision: { kind: 'action', action: finish },
          prior: 0.4,
          visits: 20,
          child: leaf('a', [0.35, 0.05, 0.6]),
        },
      ],
      [
        'poke-c',
        {
          decisionKey: 'poke-c',
          decision: { kind: 'action', action: poke },
          prior: 0.3,
          visits: 20,
          child: leaf('a', [0.5, 0.2, 0.3]),
        },
      ],
      [
        'draw',
        {
          decisionKey: 'draw',
          decision: { kind: 'action', action: draw },
          prior: 0.3,
          visits: 20,
          child: leaf('a', [0.48, 0.22, 0.3]),
        },
      ],
    ]);

    const root: SearchNode = {
      infoSetKey: 'root:a',
      ownerPlayerId: 'a',
      decisionKind: 'action',
      visits: 60,
      valueSums: new Float64Array(3),
      children,
    };

    // explorationConstant 0 → pure exploitation of owner mean (max^n).
    const chosen = selectChild(root, 0, 0);
    expect(chosen.decisionKey).not.toBe('finish-b');
    expect(['poke-c', 'draw']).toContain(chosen.decisionKey);
  });
});
