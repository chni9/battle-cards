import { describe, expect, it } from 'vitest';

import { KIT_IDS } from '../domain/kit';
import {
  allowedKitIds,
  defaultLobbyRules,
  isTurnTimeSeconds,
  MAX_TURN_TIME_SECONDS,
  MIN_TURN_TIME_SECONDS,
  parseExcludedKitIds,
  toggleExcludedKit,
} from './lobby-rules';

describe('lobby rules (rules spec §6 Setup)', () => {
  it('starts with every Classic kit allowed, picks on, and a 60 second turn', () => {
    const rules = defaultLobbyRules();
    expect(rules.excludedKitIds).toEqual([]);
    expect(rules.randomOnly).toBe(false);
    expect(rules.turnTimeSeconds).toBe(60);
    expect(allowedKitIds(rules)).toEqual(KIT_IDS);
  });

  it('accepts a whole number of seconds from 5 to 180', () => {
    expect(isTurnTimeSeconds(MIN_TURN_TIME_SECONDS)).toBe(true);
    expect(isTurnTimeSeconds(MAX_TURN_TIME_SECONDS)).toBe(true);
    expect(isTurnTimeSeconds(60)).toBe(true);
    expect(isTurnTimeSeconds(4)).toBe(false);
    expect(isTurnTimeSeconds(181)).toBe(false);
    expect(isTurnTimeSeconds(10.5)).toBe(false);
  });

  it('keeps at least one kit allowed', () => {
    const rules = defaultLobbyRules();
    let current = rules;

    for (const kitId of KIT_IDS.slice(0, -1)) {
      const next = toggleExcludedKit(current, kitId);
      expect(next).not.toBeNull();
      if (next !== null) {
        current = next;
      }
    }

    expect(allowedKitIds(current)).toEqual([KIT_IDS[KIT_IDS.length - 1]]);
    expect(toggleExcludedKit(current, KIT_IDS[KIT_IDS.length - 1] ?? 'assassin')).toBeNull();
  });

  it('rejects an exclusion list that names every kit', () => {
    expect(parseExcludedKitIds([...KIT_IDS])).toEqual({ ok: false, reason: 'none-allowed' });
  });

  it('rejects an unknown or repeated kit id', () => {
    expect(parseExcludedKitIds(['not-a-kit'])).toEqual({ ok: false, reason: 'invalid' });
    expect(parseExcludedKitIds(['assassin', 'assassin'])).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('stores excluded kits in catalog order', () => {
    const parsed = parseExcludedKitIds(['ghost', 'assassin']);
    expect(parsed).toEqual({
      ok: true,
      excludedKitIds: ['assassin', 'ghost'],
    });
  });
});
