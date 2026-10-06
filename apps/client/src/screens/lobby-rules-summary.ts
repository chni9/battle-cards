/**
 * Guest-facing table rules — rules spec §6 Setup.
 * Shown before Ready. The host sees the same sentences next to the controls.
 */

import { allowedKitIds, getKit, KIT_IDS, type LobbyRules } from '@card-battle/shared';

export function lobbyRulesKitLine(rules: LobbyRules): string {
  const allowed = allowedKitIds(rules);

  if (allowed.length === KIT_IDS.length) {
    return 'All kits are allowed.';
  }

  const names = allowed.map((kitId) => getKit(kitId).name);
  return `Allowed kits: ${names.join(', ')}.`;
}

export function lobbyRulesDealLine(rules: LobbyRules): string {
  if (rules.randomOnly) {
    return 'Kits are dealt at random. Nobody picks.';
  }

  return 'Players may choose an allowed kit, or stay on Random.';
}

export function lobbyRulesTurnLine(rules: LobbyRules): string {
  return `Human turns last ${String(rules.turnTimeSeconds)} seconds.`;
}
