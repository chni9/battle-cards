/**
 * Table rules strip — technical spec v7 §7.4 (the lobby strip, visible to everyone), §6.11 and
 * §7.6 (the same read-only sheet from the table menu and on Game over), §11 (the excluded
 * state is never conveyed by color alone, Q15). Appendix A `lobby-rules-summary` (clock with
 * the server-effective seconds, the Random-only mark, 16 kit faces) and `rules-recall-table-end`.
 * L72-16.
 *
 * One chrome button that opens `RulesSheet`. Its content is the summary and is phrasing only,
 * so the portraits are the non-clickable `KitPortrait` (`<img alt>` = kit name) and no control
 * nests in the button:
 * - a header row: the visible "Table rules" and a decorative `chevron-right`, the cue that a tap
 *   opens details. The button's `aria-label` is the same `TABLE_RULES_LABEL`, so its name is
 *   exactly what is on screen (WCAG 2.5.3 Label in Name);
 * - the clock and the seconds, exactly as received from `rules` (never clamped, never
 *   `DEFAULT_TURN_TIME_SECONDS`: a server default can exceed the host maximum of 180), then,
 *   only when `randomOnly` is set, the `random` icon and the word "Random";
 * - the 16 kits in `KIT_IDS` order, the excluded ones dimmed and greyscale on the portrait only
 *   and captioned "Excluded" in `--text-2` at full opacity.
 *
 * Every face cell has the same fixed width, wide enough for the 11px "Excluded" caption (about
 * 48px), so the columns line up for any mix of excluded kits. The cells sit in a 4 column grid
 * that becomes 8 columns once the strip's own width allows (a container query, not a viewport
 * one), so 16 kits fill whole rows: 4 by 4 on a phone, 2 by 8 when wide.
 *
 * The button is also described by a hidden summary (`rulesSummaryText`, the same words), so a
 * screen reader user hears the rules without opening the sheet. The summary is a sibling of
 * the button, not inside it, and `hidden` (a described-by target may be hidden), so it adds no
 * layout and no duplicate text to the strip.
 *
 * Callers supply `rules` and hide the strip when the rules are unknown (a reload mid-game, the
 * tutorial): the strip never invents defaults and the tutorial never mounts it (§7.4, §6.11).
 * The press drops it by `--chrome-press-y` at full motion and only dims it under reduced
 * motion (§5.7); `data-motion` says which.
 *
 * With `editor` (the host, the solo menu: L76-09, §7.4) the same sheet holds `RulesEditor`, and
 * with `editor.serverDefaultTime` the clock and the spoken summary read "Server default"; the
 * strip itself is never disabled, so the rules stay readable while busy or reconnecting.
 */

import type { LobbyRules } from '@card-battle/shared';
import { useId, useRef, useState, type ReactElement } from 'react';
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
import { turnTimeLabel, type RulesEditorBinding } from './rules-editor-model';
import { RulesSheet } from './rules-sheet';
import { rulesKitFaces, rulesSummaryText } from './rules-summary';

export interface RulesStripProps {
  rules: LobbyRules;
  className?: string;
  /** The host or the solo menu: the sheet holds `RulesEditor` (L76-09). Absent: read-only. */
  editor?: RulesEditorBinding;
}

/** 4 columns, 8 once the strip's content is 26rem wide (8 cells of 3.25rem), so 16 kits fill whole rows. */
const FACE_GRID_CLASS = 'grid grid-cols-4 gap-x-1 gap-y-2 @min-[26rem]:grid-cols-8';
/** `w-12` (48px) holds the 11px "Excluded" caption (about 48px); it is the same for every face. */
const FACE_CELL_CLASS = 'flex w-12 flex-col items-center justify-self-center gap-1';

export function RulesStrip({ rules, className = '', editor }: RulesStripProps): ReactElement {
  const [open, setOpen] = useState(false);
  // Safari does not focus a button on click, so the sheet's focus trap would find no opener to
  // return to; the strip hands focus back itself on every close (P2 critique b, L76-18).
  const stripRef = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const summaryId = useId();
  const clock = turnTimeLabel(rules, editor?.serverDefaultTime === true);

  return (
    <>
      <button
        ref={stripRef}
        type="button"
        aria-label={TABLE_RULES_LABEL}
        aria-describedby={summaryId}
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
        <span className="flex w-full items-center justify-between gap-2">
          <span className="font-v7-display text-v7-body leading-none text-v7-text">
            {TABLE_RULES_LABEL}
          </span>
          <Icon name="chevron-right" size={18} />
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-v7-display text-v7-title leading-none">
            <Icon name="clock" size={22} />
            <span>{clock}</span>
          </span>
          {rules.randomOnly ? (
            <span className="inline-flex items-center gap-1.5 font-v7-body text-v7-body font-extrabold">
              <Icon name="random" size={22} />
              <span>Random</span>
            </span>
          ) : null}
        </span>
        <span className="@container block w-full">
          <span className={FACE_GRID_CLASS}>
            {rulesKitFaces(rules).map((face) => (
              <span
                key={face.kitId}
                data-kit-id={face.kitId}
                data-excluded={face.excluded ? 'true' : 'false'}
                className={FACE_CELL_CLASS}
              >
                <span className={face.excluded ? 'opacity-40 grayscale' : ''}>
                  <KitPortrait kitId={face.kitId} size="thumb" />
                </span>
                {face.excluded ? (
                  <span className="font-v7-body text-v7-micro font-extrabold leading-none whitespace-nowrap text-v7-text-2">
                    {EXCLUDED_LABEL}
                  </span>
                ) : null}
              </span>
            ))}
          </span>
        </span>
      </button>
      <span id={summaryId} hidden>
        {rulesSummaryText(rules, clock)}
      </span>
      <RulesSheet
        open={open}
        rules={rules}
        onClose={() => {
          setOpen(false);
          stripRef.current?.focus();
        }}
        {...(editor !== undefined ? { editor } : {})}
      />
    </>
  );
}
