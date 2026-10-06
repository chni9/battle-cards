/**
 * Host table rules — rules spec §6 Setup.
 * Guests see the clock and kit faces. Only the host opens the settings popup.
 */

import {
  allowEveryKit,
  excludeEveryKitButFirst,
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

import { getOpponentPlaceholderUrl } from '../design/asset-lookup';
import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { IconButton } from '../design/components/icon-button';
import { KitPortrait } from '../design/components/kit-portrait';

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
  const [open, setOpen] = useState(false);
  const sliderSeconds = isTurnTimeSeconds(rules.turnTimeSeconds)
    ? rules.turnTimeSeconds
    : MAX_TURN_TIME_SECONDS;

  return (
    <section className="mt-6 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <ClockIcon />
            <span>{String(rules.turnTimeSeconds)}s</span>
          </span>
          {rules.randomOnly ? <RandomMark /> : null}
        </div>
        {editable ? (
          <IconButton
            aria-label="Table rules"
            onClick={() => {
              setOpen(true);
            }}
          >
            <GearIcon />
          </IconButton>
        ) : null}
      </div>
      <KitFaceRow rules={rules} />
      <Dialog
        open={open}
        title="Table rules"
        onClose={() => {
          setOpen(false);
        }}
        panelClassName="max-w-lg"
        actions={
          <Button
            compact
            type="button"
            variant="green"
            onClick={() => {
              setOpen(false);
            }}
          >
            Close
          </Button>
        }
      >
        <label className="block text-sm font-medium text-ink">
          Human turn
          <span className="mt-2 flex items-center gap-3">
            <ClockIcon />
            <input
              type="range"
              min={MIN_TURN_TIME_SECONDS}
              max={MAX_TURN_TIME_SECONDS}
              step={1}
              value={sliderSeconds}
              aria-label="Human turn seconds"
              className="h-11 min-w-0 flex-1 accent-[var(--color-cta-orange)]"
              onChange={(event) => {
                const next = Number(event.target.value);

                if (isTurnTimeSeconds(next)) {
                  onTurnTimeChange?.(next);
                }
              }}
            />
            <span className="w-12 text-right font-semibold">{String(sliderSeconds)}s</span>
          </span>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            compact
            type="button"
            variant="green"
            onClick={() => {
              onExcludedChange?.(allowEveryKit(rules).excludedKitIds);
            }}
          >
            All
          </Button>
          <Button
            compact
            type="button"
            variant="orange"
            onClick={() => {
              onExcludedChange?.(excludeEveryKitButFirst(rules).excludedKitIds);
            }}
          >
            None
          </Button>
          <Button
            compact
            type="button"
            variant={rules.randomOnly ? 'green' : 'orange'}
            aria-pressed={rules.randomOnly}
            onClick={() => {
              onRandomOnlyChange?.(!rules.randomOnly);
            }}
          >
            Random
          </Button>
        </div>
        <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {KIT_IDS.map((kitId) => {
            const allowed = !rules.excludedKitIds.includes(kitId);
            const lastAllowed = allowed && rules.excludedKitIds.length === KIT_IDS.length - 1;

            return (
              <li key={kitId}>
                <button
                  type="button"
                  aria-pressed={allowed}
                  aria-label={getKit(kitId).name}
                  disabled={lastAllowed}
                  className="flex w-full flex-col items-center rounded-[length:var(--radius-card)] border border-border-soft p-1 enabled:hover:border-border disabled:cursor-not-allowed"
                  onClick={() => {
                    const next = toggleExcludedKit(rules, kitId);

                    if (next !== null) {
                      onExcludedChange?.(next.excludedKitIds);
                    }
                  }}
                >
                  <span className={allowed ? '' : 'opacity-40 grayscale'}>
                    <KitPortrait kitId={kitId} className="w-full max-w-[4.5rem]" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </section>
  );
}

function KitFaceRow({ rules }: { rules: LobbyRules }): ReactElement {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {KIT_IDS.map((kitId) => {
        const allowed = !rules.excludedKitIds.includes(kitId);

        return (
          <li key={kitId} className={allowed ? '' : 'opacity-40 grayscale'}>
            <KitPortrait kitId={kitId} className="w-10" />
          </li>
        );
      })}
    </ul>
  );
}

function RandomMark(): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <img
        src={getOpponentPlaceholderUrl()}
        alt=""
        width={40}
        height={52}
        className="aspect-[3/4] w-8 rounded-[length:var(--radius-card)] border border-border object-contain"
        draggable={false}
      />
      Random
    </span>
  );
}

function ClockIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden className="text-ink">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4.5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden className="text-ink">
      <path
        fill="currentColor"
        d="M10.2 2.8h3.6l.4 2.2a7 7 0 0 1 1.7.7l2-1.1 1.8 3.1-1.7 1.5a7 7 0 0 1 0 1.6l1.7 1.5-1.8 3.1-2-1.1a7 7 0 0 1-1.7.7l-.4 2.2h-3.6l-.4-2.2a7 7 0 0 1-1.7-.7l-2 1.1-1.8-3.1 1.7-1.5a7 7 0 0 1 0-1.6L4.3 7.7l1.8-3.1 2 1.1a7 7 0 0 1 1.7-.7l.4-2.2zM12 9.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2z"
      />
    </svg>
  );
}
