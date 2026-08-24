/**
 * Shop-style card picker tile — L44-01 / technical spec v6 §6.4.
 * Hidden identity uses the attack verso (designer 2026-08-24), never an instance id.
 */

import type { CardInstance } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';

import { getCardBackUrl } from '../asset-lookup';
import { Card } from './card';
import { choiceTileClassName } from './choice-tile-chrome';

export const HIDDEN_CARD_CAPTION = 'Hidden card';

export interface CardChoiceTileProps {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  faded?: boolean;
  /** Known face. `null` shows the attack verso. */
  instance: CardInstance | null;
  caption: string;
  meta?: ReactNode;
  ariaLabel: string;
}

export function CardChoiceTile({
  selected,
  onSelect,
  disabled = false,
  faded = false,
  instance,
  caption,
  meta,
  ariaLabel,
}: CardChoiceTileProps): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onSelect}
      className={choiceTileClassName({ selected, disabled, faded })}
    >
      {instance === null ? (
        <img
          src={getCardBackUrl('attack')}
          alt=""
          className="aspect-[2/3] w-full max-w-[5.5rem] object-contain"
          draggable={false}
        />
      ) : (
        <Card
          instance={instance}
          detail="thumb"
          className="pointer-events-none w-full max-w-[5.5rem]"
        />
      )}
      <span
        className={[
          'mt-1 w-full truncate text-center text-xs font-semibold',
          instance === null ? 'text-ink-muted' : 'text-ink',
        ].join(' ')}
      >
        {caption}
      </span>
      {meta}
    </button>
  );
}
