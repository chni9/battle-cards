/**
 * The in-sheet pre-send choices — technical spec v7 §6.6.2 (Regeneration quantity and Card
 * Transformer consume card are "chosen in the sheet before Use sends"), §6.6.4 (a tile only
 * selects; Use sends); Appendix A `regeneration-quantity-picker`, `card-transformer-consume-picker`
 * (L74-10; decisions.md 2026-10-28 "V7 targeting and pre-send choices").
 *
 * Both groups render the tiles `cardActions(...).use` models and never re-derive a price or a
 * consumable card (golden rule 8). A tile press only reports the pick; nothing is sent from here.
 */

import type { CardInstance } from '@card-battle/shared';
import type { ReactElement, RefObject } from 'react';

import { Card } from '../../ui/card/card';
import { CostAmount } from '../../ui/card/cost-amount';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import {
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_SM_CLASS,
  chromePressClass,
  motionAttribute,
} from '../../ui/primitives/chrome-classes';
import type { RegenerationQuantity, RegenerationTile } from '../../view-model/card-actions';
import { CONSUME_GROUP_LABEL, REGENERATION_GROUP_LABEL, regenerationTileLabel } from './pre-send-model';

export interface RegenerationChoiceProps {
  tiles: readonly RegenerationTile[];
  selected: RegenerationQuantity;
  onSelect: (quantity: RegenerationQuantity) => void;
  /** Attached to the checked tile; the card sheet passes it as `initialFocusRef`. */
  checkedRef: RefObject<HTMLButtonElement | null>;
}

const TILE_CLASS = `${CHROME_SHAPE_SM_CLASS} ${CHROME_FOCUS_CLASS} ${CHROME_DISABLED_CLASS} min-h-11 bg-v7-panel-2 px-3 text-v7-text`;

export function RegenerationChoice({ tiles, selected, onSelect, checkedRef }: RegenerationChoiceProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  return (
    <div role="group" aria-label={REGENERATION_GROUP_LABEL} className="flex flex-wrap gap-2">
      {tiles.map((tile) => {
        const checked = tile.quantity === selected;
        return (
          <button
            key={tile.quantity}
            type="button"
            aria-pressed={checked}
            aria-label={regenerationTileLabel(tile)}
            // A tile carries Use's reason first, then its own price (`cardActions`).
            disabled={!tile.enabled}
            ref={checked ? checkedRef : undefined}
            data-motion={motionAttribute(reduced)}
            onClick={() => {
              onSelect(tile.quantity);
            }}
            // A ring, never a `--cta` fill, which would put the point icon on its own colour.
            className={[TILE_CLASS, checked ? 'ring-4 ring-v7-cta' : '', chromePressClass(reduced)]
              .filter((part) => part !== '')
              .join(' ')}
          >
            <span className="inline-flex items-center gap-2 font-v7-display text-v7-body">
              {tile.label}
              <CostAmount amount={{ kind: 'points', amount: tile.totalCost }} signed="cost" title={null} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface ConsumeChoiceProps {
  /** Non-empty: the sheet renders no group when there is nothing to consume. */
  options: readonly CardInstance[];
  selectedId: string;
  /** Use is disabled: the faces show, without a press action. */
  disabled: boolean;
  onSelect: (instanceId: string) => void;
}

export function ConsumeChoice({ options, selectedId, disabled, onSelect }: ConsumeChoiceProps): ReactElement {
  return (
    <div role="group" aria-label={CONSUME_GROUP_LABEL} className="flex flex-wrap gap-3">
      {options.map((option) => (
        <Card
          key={option.instanceId}
          size="tile"
          instance={option}
          selected={option.instanceId === selectedId}
          {...(disabled ? {} : { onActivate: onSelect })}
        />
      ))}
    </div>
  );
}
