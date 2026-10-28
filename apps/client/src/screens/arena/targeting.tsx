/**
 * The "Choose a target" bar — technical spec v7 §6.6.2 (Use on a targeted card collapses its sheet
 * into this bar), §6.6.4 (Cancel sends nothing), §10.6 (the new string); L74-10.
 *
 * It is the card sheet's `collapsedBar`: the Sheet primitive mounts it in its 44 px bar slot. The
 * text does not name the card, because the lifted hand card shows which one. Cancel is `quiet`
 * with the `close` icon, not `danger`, which is for leave and destroy (DESIGN.md).
 */

import type { ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { CANCEL_ACTION_LABEL } from './card-sheet-actions';
import { CHOOSE_TARGET_LABEL } from './targeting-model';

export interface TargetingBarProps {
  onCancel: () => void;
}

export function TargetingBar({ onCancel }: TargetingBarProps): ReactElement {
  return (
    <div data-zone="targeting-bar" className="flex w-full items-center gap-2">
      <p
        className={`${CHROME_SHAPE_SM_CLASS} min-w-0 flex-1 truncate bg-v7-panel px-3 py-2 font-v7-display text-v7-body text-v7-text`}
      >
        {CHOOSE_TARGET_LABEL}
      </p>
      <Button variant="quiet" icon="close" onClick={onCancel}>
        {CANCEL_ACTION_LABEL}
      </Button>
    </div>
  );
}
