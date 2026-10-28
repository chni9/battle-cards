/**
 * Multi-attack selection: technical spec v7 §6.6.2, §13 Q44; Appendix A
 * `table-multi-attack-target-eligibility` (L74-11).
 */
import { describe, expect, it } from 'vitest';

import { MULTI_ATTACK_MIN_ATTACKS, type MultiAttackModel } from '../../view-model/card-actions';
import { makeCard } from '../../view-model/test-fixtures';
import {
  EMPTY_MULTI_ATTACK_SELECTION, multiAttackPayload, pickMultiAttackTarget, playAttacksLabel,
  selectedMultiAttackRows, toggleMultiAttackRow,
} from './multi-attack-selection';

const BASIC = makeCard('basic-attack', { instanceId: 'atk-1' });
const STRONG = makeCard('strong-attack', { instanceId: 'str-1' });
const MODEL: MultiAttackModel = {
  rows: [{ instance: BASIC, seatIds: ['p1', 'p2'] }, { instance: STRONG, seatIds: ['p1', 'p2'] }],
  minAttacks: MULTI_ATTACK_MIN_ATTACKS,
};

describe('multi-attack selection (Q44)', () => {
  it('toggles a row on with no target, and off together with its target', () => {
    const on = toggleMultiAttackRow(EMPTY_MULTI_ATTACK_SELECTION, 'atk-1');
    expect(on).toEqual([{ instanceId: 'atk-1', targetPlayerId: null }]);
    expect(toggleMultiAttackRow(pickMultiAttackTarget(on, 'atk-1', 'p1'), 'atk-1')).toEqual([]);
  });

  it('picks a target only for a toggled row', () => {
    expect(pickMultiAttackTarget(EMPTY_MULTI_ATTACK_SELECTION, 'atk-1', 'p1')).toBe(EMPTY_MULTI_ATTACK_SELECTION);
    expect(pickMultiAttackTarget(toggleMultiAttackRow(EMPTY_MULTI_ATTACK_SELECTION, 'atk-1'), 'atk-1', 'p2'))
      .toEqual([{ instanceId: 'atk-1', targetPlayerId: 'p2' }]);
  });

  it('builds no payload below two rows or while a toggled row has no target', () => {
    const one = pickMultiAttackTarget(toggleMultiAttackRow(EMPTY_MULTI_ATTACK_SELECTION, 'atk-1'), 'atk-1', 'p1');
    expect(multiAttackPayload(MODEL, one)).toBeNull();
    expect(multiAttackPayload(MODEL, toggleMultiAttackRow(one, 'str-1'))).toBeNull();
  });

  it('sends two rows on the same seat in hand order, whatever the toggle order', () => {
    let selection = toggleMultiAttackRow(EMPTY_MULTI_ATTACK_SELECTION, 'str-1');
    selection = pickMultiAttackTarget(selection, 'str-1', 'p1');
    selection = pickMultiAttackTarget(toggleMultiAttackRow(selection, 'atk-1'), 'atk-1', 'p1');
    expect(multiAttackPayload(MODEL, selection)).toEqual({
      attacks: [{ instanceId: 'atk-1', targetPlayerId: 'p1' }, { instanceId: 'str-1', targetPlayerId: 'p1' }],
    });
  });

  it('drops rows that left the model and targets that left a row', () => {
    const shrunk: MultiAttackModel = { rows: [{ instance: BASIC, seatIds: ['p2'] }], minAttacks: MULTI_ATTACK_MIN_ATTACKS };
    let selection = pickMultiAttackTarget(toggleMultiAttackRow(EMPTY_MULTI_ATTACK_SELECTION, 'atk-1'), 'atk-1', 'p1');
    selection = pickMultiAttackTarget(toggleMultiAttackRow(selection, 'str-1'), 'str-1', 'p1');
    expect(selectedMultiAttackRows(shrunk, selection)).toEqual([{ instanceId: 'atk-1', targetPlayerId: null }]);
    expect(multiAttackPayload(shrunk, selection)).toBeNull();
  });

  it('labels Play with the selected count (V2 copy)', () => {
    expect(playAttacksLabel(2)).toBe('Play 2 attacks');
  });
});
