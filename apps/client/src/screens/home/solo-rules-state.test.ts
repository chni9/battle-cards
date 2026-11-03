/** Solo menu rules: technical spec v7 §7.1 (Q3/Q31); Lot 70; L67-01; Appendix A `solo-menu-rules`, `home-solo-path`. */
import { defaultLobbyRules, type LobbyRules } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { SoloMenuSeed } from '../solo-menu-seed';
import { applySoloRulesChange, initialSoloRulesState, soloLaunchKitSelection } from './solo-rules-state';

const SEED: SoloMenuSeed = {
  opponentCount: 3, difficulty: 'hard', kitSelection: 'assassin',
  lobbyRules: { excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 90 },
};
const rulesWith = (patch: Partial<LobbyRules>): LobbyRules => ({ ...defaultLobbyRules(), ...patch });

describe('solo rules state (spec v7 §7.1, Lot 70)', () => {
  it('starts on the default rules, the server clock and Random when there is no seed', () => {
    expect(initialSoloRulesState(undefined)).toEqual({ rules: defaultLobbyRules(), includeTurnTime: false, kitSelection: 'random' });
  });

  it('takes a Play again seed whole and sends its clock only when it is in 5–180 (L67-01)', () => {
    expect(initialSoloRulesState(SEED)).toEqual({ rules: SEED.lobbyRules, includeTurnTime: true, kitSelection: 'assassin' });
    const serverDefault: SoloMenuSeed = { ...SEED, lobbyRules: { ...SEED.lobbyRules, turnTimeSeconds: 300 } };
    expect(initialSoloRulesState(serverDefault)).toEqual({ rules: serverDefault.lobbyRules, includeTurnTime: false, kitSelection: 'assassin' });
  });

  it('turns the clock on only for an in-range time change, and keeps it on', () => {
    const start = initialSoloRulesState(undefined);
    expect(applySoloRulesChange(start, rulesWith({ randomOnly: true }), false).includeTurnTime).toBe(false);
    expect(applySoloRulesChange(start, rulesWith({ turnTimeSeconds: 200 }), true).includeTurnTime).toBe(false);
    const timed = applySoloRulesChange(start, rulesWith({ turnTimeSeconds: 45 }), true);
    expect(timed).toEqual({ rules: rulesWith({ turnTimeSeconds: 45 }), includeTurnTime: true, kitSelection: 'random' });
    expect(applySoloRulesChange(timed, rulesWith({ turnTimeSeconds: 45, excludedKitIds: ['ghost'] }), false).includeTurnTime).toBe(true);
  });

  it('resets an excluded pick to Random and keeps an allowed one', () => {
    const picked = initialSoloRulesState(SEED);
    expect(applySoloRulesChange(picked, rulesWith({ excludedKitIds: ['assassin'] }), false).kitSelection).toBe('random');
    expect(applySoloRulesChange(picked, rulesWith({ excludedKitIds: ['kamikaze'] }), false).kitSelection).toBe('assassin');
    expect(applySoloRulesChange(initialSoloRulesState(undefined), rulesWith({ excludedKitIds: ['assassin'] }), false).kitSelection).toBe('random');
  });

  it('keeps the pick under Random only, but launches Random', () => {
    const picked = initialSoloRulesState(SEED);
    const randomOnly = applySoloRulesChange(picked, { ...SEED.lobbyRules, randomOnly: true }, false);
    expect(randomOnly.kitSelection).toBe('assassin');
    expect(soloLaunchKitSelection(randomOnly)).toBe('random');
    expect(soloLaunchKitSelection(picked)).toBe('assassin');
  });
});
