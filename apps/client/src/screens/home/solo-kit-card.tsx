/**
 * The solo menu's kit card (technical spec v7 §7.1, "your kit card (Random default)"; §7.3).
 * It mirrors `LobbyKitCard`'s Your kit and Random-only cards: Your kit shows the privacy lead
 * (`KIT_PICKER_LEAD`), the pick's portrait and label, and Choose kit; under Random only, the
 * dealt line `RANDOM_ONLY_SOLO_LINE` with no heading, as the lobby host reads it. Unlike the
 * lobby's, Choose kit is disabled while a solo game launches (Q8), where the lobby keeps it live
 * while reconnecting (Lot 76 plan A.9 ruling 6). `HomeScreen` owns the `KitPickerSheet` state
 * (plan A.2). L76-11.
 */

import type { LobbyKitSelection } from '@card-battle/shared';
import { useId, type ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS } from '../../ui/primitives/chrome-classes';
import { CHOOSE_KIT_LABEL, KIT_PICKER_LEAD, RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { YOUR_KIT_TITLE } from '../lobby/lobby-copy';
import { lobbyKitSelectionLabel } from '../lobby/lobby-kit-picker';

export interface SoloKitCardProps {
  readonly selection: LobbyKitSelection;
  readonly randomOnly: boolean;
  /** Busy (solo launch): Choose kit is disabled (spec v7 §11, Q8). */
  readonly disabled: boolean;
  readonly onOpenKitPicker: () => void;
}

export function SoloKitCard({ selection, randomOnly, disabled, onOpenKitPicker }: SoloKitCardProps): ReactElement {
  const titleId = useId();

  if (randomOnly) {
    return (
      <div className={`${CHROME_SHAPE_CLASS} flex items-center gap-3 bg-v7-panel p-4`}>
        <Icon name="random" className="shrink-0" />
        <p className="font-v7-body text-v7-body font-bold text-v7-text">{RANDOM_ONLY_SOLO_LINE}</p>
      </div>
    );
  }

  return (
    <section aria-labelledby={titleId} className={`${CHROME_SHAPE_CLASS} bg-v7-panel p-4`}>
      <h2 id={titleId} className="font-v7-display text-v7-title leading-none text-v7-text">
        {YOUR_KIT_TITLE}
      </h2>
      <p className="mt-2 text-pretty font-v7-body text-v7-body text-v7-text-2">{KIT_PICKER_LEAD}</p>
      <div className="mt-3 flex items-center gap-3">
        <KitPortrait kitId={selection} size="tile" />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <p className="font-v7-display text-v7-title text-v7-text">{lobbyKitSelectionLabel(selection)}</p>
          <Button variant="secondary" disabled={disabled} onClick={onOpenKitPicker}>
            {CHOOSE_KIT_LABEL}
          </Button>
        </div>
      </div>
    </section>
  );
}
