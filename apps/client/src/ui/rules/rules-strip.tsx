/**
 * Table rules strip — technical spec v7 §7.4 (the lobby strip, visible to everyone), §6.11 and
 * §7.6 (the same read-only sheet from the table menu and on Game over), §11 (the excluded
 * state is never conveyed by color alone, Q15). Appendix A `lobby-rules-summary` (clock with
 * the server-effective seconds, the Random-only mark, 16 kit faces) and `rules-recall-table-end`.
 * L72-16.
 *
 * One chrome button named "Table rules" that opens `RulesSheet`. Its content is the summary
 * and is phrasing only, so the portraits are the non-clickable form (`<img alt>` = kit name)
 * and no control nests in the button:
 * - the clock and the seconds, exactly as received from `rules` (never clamped, never
 *   `DEFAULT_TURN_TIME_SECONDS`: a server default can exceed the host maximum of 180);
 * - the Random-only mark, only when `randomOnly` is set;
 * - the 16 kits in `KIT_IDS` order, the excluded ones dimmed and greyscale on the portrait only
 *   and captioned "Excluded" in `--text-2` at full opacity.
 *
 * Callers supply `rules` and hide the strip when the rules are unknown (a reload mid-game, the
 * tutorial): the strip never invents defaults and the tutorial never mounts it (§7.4, §6.11).
 * The press drops it by `--chrome-press-y` at full motion and only dims it under reduced
 * motion (§5.7); `data-motion` says which.
 */

import type { LobbyRules } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';
import { Icon } from '../icons/icon';
import { KitPortrait } from '../kit/kit-portrait';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import {
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_CLASS,
  chromePressClass,
  motionAttribute,
} from '../primitives/chrome-classes';
import { EXCLUDED_LABEL, TABLE_RULES_LABEL } from '../ui-copy';
import { RulesSheet } from './rules-sheet';
import { formatTurnTimeSeconds, rulesKitFaces } from './rules-summary';

export interface RulesStripProps {
  rules: LobbyRules;
  className?: string;
}

export function RulesStrip({ rules, className = '' }: RulesStripProps): ReactElement {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();

  return (
    <>
      <button
        type="button"
        aria-label={TABLE_RULES_LABEL}
        aria-haspopup="dialog"
        data-motion={motionAttribute(reduced)}
        onClick={() => {
          setOpen(true);
        }}
        className={[
          'flex min-h-11 w-full flex-col items-start gap-2 bg-v7-panel p-3 text-left text-v7-text',
          CHROME_SHAPE_CLASS,
          CHROME_FOCUS_CLASS,
          chromePressClass(reduced),
          className,
        ]
          .filter((part) => part !== '')
          .join(' ')}
      >
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-v7-display text-v7-title leading-none">
            <Icon name="clock" size={22} />
            <span>{formatTurnTimeSeconds(rules.turnTimeSeconds)}</span>
          </span>
          {rules.randomOnly ? (
            <span className="inline-flex items-center gap-1.5 font-v7-body text-v7-body font-extrabold">
              <Icon name="random" size={22} />
              <span>Random</span>
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-start gap-x-2 gap-y-2">
          {rulesKitFaces(rules).map((face) => (
            <span
              key={face.kitId}
              data-kit-id={face.kitId}
              data-excluded={face.excluded ? 'true' : 'false'}
              className="flex flex-col items-center gap-1"
            >
              <span className={face.excluded ? 'opacity-40 grayscale' : ''}>
                <KitPortrait kitId={face.kitId} size="thumb" />
              </span>
              {face.excluded ? (
                <span className="font-v7-body text-v7-micro font-extrabold leading-none text-v7-text-2">
                  {EXCLUDED_LABEL}
                </span>
              ) : null}
            </span>
          ))}
        </span>
      </button>
      <RulesSheet
        open={open}
        rules={rules}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
