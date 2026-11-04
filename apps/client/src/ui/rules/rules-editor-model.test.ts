/** Rules editor payloads (technical spec v7 §7.4, §13 Q3/Q4/Q18/Q31; Appendix A `lobby-rules-host-dialog`,
 * `lobby-rules-dialog-kit-guardrails`, `rules-turn-time-default-override`). L76-09. */
import { allowedKitIds, KIT_IDS, MAX_TURN_TIME_SECONDS, type KitId, type LobbyRules } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { SERVER_DEFAULT_LABEL } from '../ui-copy';
import {
  allKitsPayload, isLastAllowedKit, kitTogglePayload, noKitsPayload, randomOnlyPayload,
  sliderReadout, sliderSeconds, turnTimeLabel, turnTimePayload,
} from './rules-editor-model';

function rules(overrides: Partial<LobbyRules> = {}): LobbyRules {
  return { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, ...overrides };
}
const allBut = (...kept: KitId[]): KitId[] => KIT_IDS.filter((kitId) => !kept.includes(kitId));

describe('rules editor model (L76-09)', () => {
  it('puts the slider on the received seconds in 5–180, and at 180 otherwise (300 → 180)', () => {
    expect([5, 45, 180].map((turnTimeSeconds) => sliderSeconds(rules({ turnTimeSeconds })))).toEqual([5, 45, 180]);
    expect([300, 4, 60.5].map((turnTimeSeconds) => sliderSeconds(rules({ turnTimeSeconds }))))
      .toEqual([MAX_TURN_TIME_SECONDS, MAX_TURN_TIME_SECONDS, MAX_TURN_TIME_SECONDS]);
  });

  it('builds the only payload with turnTimeSeconds, and none outside 5–180', () => {
    expect(turnTimePayload(rules({ excludedKitIds: ['ghost'], randomOnly: true }), 90))
      .toStrictEqual({ excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 90 });
    expect([4, 181, 12.5].map((seconds) => turnTimePayload(rules(), seconds))).toEqual([null, null, null]);
  });

  it('toggles one kit in KIT_IDS order, and gives null for the last allowed kit', () => {
    expect(kitTogglePayload(rules({ excludedKitIds: ['gambler'] }), 'untouchable'))
      .toStrictEqual({ excludedKitIds: ['untouchable', 'gambler'], randomOnly: false });
    expect(kitTogglePayload(rules({ excludedKitIds: ['ghost', 'gambler'], randomOnly: true }), 'ghost'))
      .toStrictEqual({ excludedKitIds: ['gambler'], randomOnly: true });
    expect(kitTogglePayload(rules({ excludedKitIds: allBut('wizard') }), 'wizard')).toBeNull();
  });

  it('All allows every kit; None keeps only KIT_IDS[0], even when another kit was the one kept', () => {
    expect(allKitsPayload(rules({ excludedKitIds: ['ghost'], randomOnly: true }))).toStrictEqual({ excludedKitIds: [], randomOnly: true });
    for (const shown of [rules(), rules({ excludedKitIds: allBut('wizard') })]) {
      const payload = noKitsPayload(shown);
      expect(allowedKitIds(payload)).toEqual([KIT_IDS[0]]);
      expect(payload).toStrictEqual({ excludedKitIds: KIT_IDS.slice(1), randomOnly: false });
    }
  });

  it('flips Random only and keeps the exclusions', () => {
    expect(randomOnlyPayload(rules({ excludedKitIds: ['ghost'] }), true)).toStrictEqual({ excludedKitIds: ['ghost'], randomOnly: true });
    expect(randomOnlyPayload(rules({ randomOnly: true }), false)).toStrictEqual({ excludedKitIds: [], randomOnly: false });
  });

  it('never puts turnTimeSeconds in a Kit, All, None or Random payload over a 300 s server default (Review Focus 2)', () => {
    const serverDefault = rules({ turnTimeSeconds: 300, excludedKitIds: ['ghost'] });
    const payloads = [
      kitTogglePayload(serverDefault, 'wizard'), allKitsPayload(serverDefault),
      noKitsPayload(serverDefault), randomOnlyPayload(serverDefault, true),
    ];
    for (const payload of payloads) {
      expect(payload).not.toBeNull();
      expect(payload).not.toHaveProperty('turnTimeSeconds');
    }
    expect(sliderSeconds(serverDefault)).toBe(180);
  });

  it('names the last allowed kit only', () => {
    const onlyWizard = rules({ excludedKitIds: allBut('wizard') });
    expect(isLastAllowedKit(onlyWizard, 'wizard')).toBe(true);
    expect(isLastAllowedKit(onlyWizard, 'ghost')).toBe(false);
    expect(isLastAllowedKit(rules({ excludedKitIds: allBut('wizard', 'ghost') }), 'wizard')).toBe(false);
  });

  it('reads Server default on the strip, and on the slider at its untouched value, while serverDefaultTime', () => {
    expect(turnTimeLabel(rules({ turnTimeSeconds: 300 }), false)).toBe('300s');
    expect(turnTimeLabel(rules(), true)).toBe(SERVER_DEFAULT_LABEL);
    expect(sliderReadout(rules(), 60, true)).toBe(SERVER_DEFAULT_LABEL);
    expect(sliderReadout(rules(), 90, true)).toBe('90s');
    expect(sliderReadout(rules(), 60, false)).toBe('60s');
    expect(sliderReadout(rules({ turnTimeSeconds: 300 }), 180, true)).toBe(SERVER_DEFAULT_LABEL);
  });
});
