/**
 * Host controls and the guest summary for table rules — rules spec §6 Setup.
 */

import {
  getKit,
  isTurnTimeSeconds,
  KIT_IDS,
  MAX_TURN_TIME_SECONDS,
  MIN_TURN_TIME_SECONDS,
  toggleExcludedKit,
  type KitId,
  type LobbyRules,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import {
  lobbyRulesDealLine,
  lobbyRulesKitLine,
  lobbyRulesTurnLine,
} from './lobby-rules-summary';

export interface LobbyRulesPanelProps {
  rules: LobbyRules;
  editable: boolean;
  onExcludedChange?: (excludedKitIds: readonly KitId[]) => void;
  onRandomOnlyChange?: (randomOnly: boolean) => void;
  onTurnTimeChange?: (turnTimeSeconds: number) => void;
}

export function LobbyRulesPanel({
  rules,
  editable,
  onExcludedChange,
  onRandomOnlyChange,
  onTurnTimeChange,
}: LobbyRulesPanelProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);
  const turnTimeValue = draft ?? String(rules.turnTimeSeconds);

  const commitTurnTime = (): void => {
    const parsed = Number(turnTimeValue);
    setDraft(null);

    if (!isTurnTimeSeconds(parsed) || parsed === rules.turnTimeSeconds) {
      return;
    }

    onTurnTimeChange?.(parsed);
  };

  return (
    <section className="mt-6 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
      <h2 className="text-sm font-medium text-ink-muted">Table rules</h2>
      {editable ? (
        <div className="mt-3 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Kits</legend>
            <p className="text-sm text-ink-muted">
              Green kits can be chosen. At least one stays allowed.
            </p>
            <div className="flex flex-wrap gap-2">
              {KIT_IDS.map((kitId) => {
                const allowed = !rules.excludedKitIds.includes(kitId);
                const lastAllowed = allowed && rules.excludedKitIds.length === KIT_IDS.length - 1;

                return (
                  <Button
                    key={kitId}
                    type="button"
                    variant={allowed ? 'green' : 'orange'}
                    disabled={lastAllowed}
                    onClick={() => {
                      const next = toggleExcludedKit(rules, kitId);

                      if (next !== null) {
                        onExcludedChange?.(next.excludedKitIds);
                      }
                    }}
                  >
                    {getKit(kitId).name}
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={rules.randomOnly}
              onChange={(event) => {
                onRandomOnlyChange?.(event.target.checked);
              }}
            />
            Random kits only
          </label>
          <label className="block text-sm font-medium text-ink">
            Human turn (seconds)
            <input
              type="number"
              min={MIN_TURN_TIME_SECONDS}
              max={MAX_TURN_TIME_SECONDS}
              step={1}
              inputMode="numeric"
              value={turnTimeValue}
              className="mt-1.5 block w-28 min-h-11 rounded-[length:var(--radius-control)] border border-border bg-surface px-3 py-2 font-sans text-base text-ink"
              onFocus={() => {
                setDraft(String(rules.turnTimeSeconds));
              }}
              onBlur={() => {
                commitTurnTime();
              }}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
            />
          </label>
        </div>
      ) : null}
      <div className="mt-3 space-y-1 text-sm text-ink">
        <p>{lobbyRulesKitLine(rules)}</p>
        <p>{lobbyRulesDealLine(rules)}</p>
        <p>{lobbyRulesTurnLine(rules)}</p>
      </div>
    </section>
  );
}
