import { describe, expect, it } from 'vitest';

import { defaultLobbyRules } from '@card-battle/shared';

import {
  lobbyRulesDealLine,
  lobbyRulesKitLine,
  lobbyRulesTurnLine,
} from './lobby-rules-summary';

describe('lobby rules copy (rules spec §6 Setup)', () => {
  it('starts from every kit, player picks, and 60 seconds', () => {
    const rules = defaultLobbyRules();
    expect(lobbyRulesKitLine(rules)).toBe('All kits are allowed.');
    expect(lobbyRulesDealLine(rules)).toBe(
      'Players may choose an allowed kit, or stay on Random.',
    );
    expect(lobbyRulesTurnLine(rules)).toBe('Human turns last 60 seconds.');
  });

  it('names the kits still allowed and a random-only deal', () => {
    const rules = {
      excludedKitIds: ['ghost' as const],
      randomOnly: true,
      turnTimeSeconds: 45,
    };
    expect(lobbyRulesKitLine(rules)).not.toMatch(/Ghost/);
    expect(lobbyRulesKitLine(rules)).toMatch(/Allowed kits:/);
    expect(lobbyRulesDealLine(rules)).toBe('Kits are dealt at random. Nobody picks.');
    expect(lobbyRulesTurnLine(rules)).toBe('Human turns last 45 seconds.');
  });
});
