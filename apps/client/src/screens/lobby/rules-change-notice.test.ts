/**
 * Guest rule-change notices: technical spec v7 §7.4 (Q16, Q17), §13; Appendix A
 * `lobby-rules-change-guest-effects`; A.9 rulings 4 and 10 (L76-15).
 */
import { defaultLobbyRules, type LobbyRules, type LobbyStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { lobbyRulesNotice, mergeRulesNotice } from './rules-change-notice';
import { guestLobbyView, hostLobbyView, walkInLobbyView } from './test-lobby';

const rules = (overrides: Partial<LobbyRules> = {}): LobbyRules => ({ ...defaultLobbyRules(), ...overrides });
/** Bea, the seated guest of `guestLobbyView`, who picked Assassin unless told otherwise. */
const bea = (lobbyRules: LobbyRules, yourKitSelection: LobbyStateView['yourKitSelection'] = 'assassin'): LobbyStateView =>
  guestLobbyView({ lobbyRules, yourKitSelection });

describe('lobbyRulesNotice (§7.4, Q16, Q17)', () => {
  it('fires nothing on the first view, or on a later view with the same rules', () => {
    expect(lobbyRulesNotice(null, bea(rules()))).toBeNull();
    expect(lobbyRulesNotice(bea(rules()), bea(rules()))).toBeNull();
    expect(lobbyRulesNotice(bea(rules({ excludedKitIds: ['ghost', 'witch'] })), bea(rules({ excludedKitIds: ['witch', 'ghost'] })))).toBeNull();
  });

  it("fires 'Rules changed' for a change of each field, with no reset line", () => {
    const before = bea(rules());
    for (const changed of [rules({ excludedKitIds: ['ghost'] }), rules({ randomOnly: true }), rules({ turnTimeSeconds: 90 })]) {
      expect(lobbyRulesNotice(before, bea(changed))).toEqual({ pickReset: false });
    }
  });

  it("fires nothing on the guest's own Random pick", () => {
    expect(lobbyRulesNotice(bea(rules()), bea(rules(), 'random'))).toBeNull();
  });

  it('gives no reset line for a Random-only toggle, which keeps the pick', () => {
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ randomOnly: true })))).toEqual({ pickReset: false });
    expect(lobbyRulesNotice(bea(rules({ randomOnly: true })), bea(rules()))).toEqual({ pickReset: false });
  });

  it('adds the reset line only when the host newly excluded the pick', () => {
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ excludedKitIds: ['assassin'] }), 'random'))).toEqual({ pickReset: true });
    // Bea went Random herself while the host excluded another kit:
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ excludedKitIds: ['ghost'] }), 'random'))).toEqual({ pickReset: false });
    // Another kit excluded, the pick stays:
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ excludedKitIds: ['ghost'] })))).toEqual({ pickReset: false });
  });

  it('gives the host and walk-ins no notice (A.9 ruling 10)', () => {
    expect(lobbyRulesNotice(hostLobbyView(), hostLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
    expect(lobbyRulesNotice(walkInLobbyView(), walkInLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
  });

  it('compares only two views of the same room and seat', () => {
    expect(lobbyRulesNotice(bea(rules()), guestLobbyView({ gameCode: 'OTHER1', lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
    expect(lobbyRulesNotice(bea(rules()), guestLobbyView({ you: 'dee', lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
  });
});

describe('mergeRulesNotice (L76-15)', () => {
  it('opens on a notice, keeps an open toast on none, and keeps its reset line until it closes', () => {
    expect(mergeRulesNotice(null, null)).toBeNull();
    expect(mergeRulesNotice(null, { pickReset: false })).toEqual({ pickReset: false });
    expect(mergeRulesNotice({ pickReset: true }, null)).toEqual({ pickReset: true });
    expect(mergeRulesNotice({ pickReset: true }, { pickReset: false })).toEqual({ pickReset: true });
    expect(mergeRulesNotice({ pickReset: false }, { pickReset: true })).toEqual({ pickReset: true });
  });
});
