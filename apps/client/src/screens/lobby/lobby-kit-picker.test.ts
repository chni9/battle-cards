/**
 * Lobby kit picker roster — L49-02.
 */

import { KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  LOBBY_KIT_PICKER_SELECTIONS,
  lobbyKitSelectionLabel,
} from './lobby-kit-picker';

describe('lobby kit picker (L49-02)', () => {
  it('lists random then every catalog kit', () => {
    expect(LOBBY_KIT_PICKER_SELECTIONS[0]).toBe('random');
    expect(LOBBY_KIT_PICKER_SELECTIONS.slice(1)).toEqual([...KIT_IDS]);
    expect(LOBBY_KIT_PICKER_SELECTIONS).toHaveLength(KIT_IDS.length + 1);
  });

  it('labels random without a catalog kit name', () => {
    expect(lobbyKitSelectionLabel('random')).toBe('Random kit');
    expect(lobbyKitSelectionLabel('assassin')).toBe('Assassin');
  });
});
