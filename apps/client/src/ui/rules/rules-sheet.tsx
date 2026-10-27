/**
 * Table rules sheet — technical spec v7 §6.11 (the recall from the table menu and from Game
 * over), §7.4 (the lobby sheet for guests and walk-ins, Q15) and §6.7 (a read-only `Sheet`:
 * Esc, backdrop and swipe-down close it, and only the top sheet takes Esc, Q49). Appendix A
 * `lobby-rules-summary`, `rules-recall-table-end`. L72-16.
 *
 * It shows what the host set and nothing else: the human turn time as received (never clamped,
 * so a server default above 180 reads as sent), the Random mark when kits are dealt, and all 16
 * kits with the excluded ones named in words (`EXCLUDED_LABEL`), never by color or greyscale
 * alone (Q15). It has no editable control and its only button is Close, which also gives the
 * focus trap a target. L76 adds the host editor in this folder; until then the sheet is the
 * guests' view, and the L74 menu and the L77 Game over recall open it directly.
 *
 * Only the portrait is dimmed. The name and the "Excluded" caption keep `--text-2` at full
 * opacity, so the state stays readable on `--panel`. The portrait is `aria-hidden`: the visible
 * name already names the kit. "Human turn", "Random" and "Close" are existing labels.
 */

import type { LobbyRules } from '@card-battle/shared';
import type { ReactElement } from 'react';
import { Icon } from '../icons/icon';
import { KitPortrait } from '../kit/kit-portrait';
import { Button } from '../primitives/button';
import { Sheet } from '../primitives/sheet';
import { EXCLUDED_LABEL, TABLE_RULES_LABEL } from '../ui-copy';
import { formatTurnTimeSeconds, rulesKitFaces } from './rules-summary';

export interface RulesSheetProps {
  open: boolean;
  rules: LobbyRules;
  onClose: () => void;
}

/**
 * Auto-fill columns of at least 5.5rem: the longest kit name ("Indestructible") fits a column on
 * a 320 px phone (3 columns) and on the sheet's 28rem desktop panel (4 columns), with no
 * breakpoint to keep in step with the panel width.
 */
const KIT_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-2 gap-y-4';

export function RulesSheet({ open, rules, onClose }: RulesSheetProps): ReactElement | null {
  return (
    <Sheet
      mode="read-only"
      open={open}
      title={TABLE_RULES_LABEL}
      placement="auto"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="inline-flex items-center gap-2">
            <Icon name="clock" size={24} />
            <span className="font-v7-body text-v7-body font-bold text-v7-text-2">Human turn</span>
            <span className="font-v7-display text-v7-title leading-none text-v7-text">
              {formatTurnTimeSeconds(rules.turnTimeSeconds)}
            </span>
          </p>
          {rules.randomOnly ? (
            <p className="inline-flex items-center gap-2">
              <Icon name="random" size={24} />
              <span className="font-v7-body text-v7-body font-extrabold text-v7-text">Random</span>
            </p>
          ) : null}
        </div>
        <ul className={KIT_GRID_CLASS}>
          {rulesKitFaces(rules).map((face) => (
            <li
              key={face.kitId}
              data-kit-id={face.kitId}
              data-excluded={face.excluded ? 'true' : 'false'}
              className="flex min-w-0 flex-col items-center gap-1.5 text-center"
            >
              <span aria-hidden="true" className={face.excluded ? 'opacity-40 grayscale' : ''}>
                <KitPortrait kitId={face.kitId} size="thumb" />
              </span>
              <span className="max-w-full font-v7-body text-v7-caption font-bold leading-tight break-words text-v7-text-2">
                {face.name}
              </span>
              {face.excluded ? (
                <span className="font-v7-body text-v7-micro font-extrabold leading-none text-v7-text-2">
                  {EXCLUDED_LABEL}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
