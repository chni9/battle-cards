// Arena entry before L74 (technical spec v7 §4.4 / L72-20); L74-01 replaces this test.
import type { PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { TableScreen } from '../table';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';

const noop = (): void => { /* no intent fires */ };

function classicView(): PlayingStateView {
  return {
    phase: 'playing', you: 'a', gameCode: 'ABCDEF', currentTurnPlayerId: 'a', turnSequence: 1,
    turnOrder: ['a'], turnDeadlineMs: null, players: [],
    self: {
      lives: 10, shield: 0, shieldIsUpgraded: false, points: 0, upgradePoints: 0, kitId: 'warrior',
      hand: [], specialCards: [], activePersistentEffects: [], attackBlockCharges: 0,
    },
    pendingEffects: [], actionLog: [], pool: [], poolBuyCost: 1, pendingSentences: [],
    playKind: 'classic', tutorialIndex: null,
  };
}

function tableProps(): ArenaScreenProps {
  return {
    view: classicView(), actionReject: null, onDismissActionReject: noop, statusLabel: 'Connected',
    nowMs: 0, deadlineMs: null, lastActionResolved: null, subChoice: null,
    onDraw: noop, onPlayCard: noop, onPlayMultipleAttacks: noop, onResolveSubChoice: noop,
    onBuyCard: noop, onSellCard: noop, onUpgradeCard: noop, onBuyUpgradePoint: noop,
    onBuySpecialCard: noop, onBuyPoolCard: noop, onClearSpy: noop, onSellUpgradePoint: noop,
    onLeave: noop, onForfeit: noop, onSendChat: noop,
  };
}

function expectPassThrough(props: ArenaScreenProps): void {
  const element = ArenaScreen(props);
  expect(element.type).toBe(TableScreen);
  expect(element.props).toEqual(props);
}

describe('arena screen before L74 (technical spec v7 §4.4 / L72-20)', () => {
  it('renders the classic TableScreen with exactly the props it receives', () => {
    expectPassThrough(tableProps());
  });

  it('forwards the finished-board props unchanged', () => {
    expectPassThrough({ ...tableProps(), readOnly: true, youWon: true, onShowStats: noop, onOpenFeedback: noop });
  });
});
