/**
 * Fluid card row — equal CSS columns fill the band width.
 * Faces scale with column width; height capped by the band (no crop of usable art).
 */

import { type CardInstance } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';

export interface FluidCardRowProps {
  cards: readonly CardInstance[];
  detail: 'face' | 'thumb';
  emptyLabel: string;
  onSelect?: (instanceId: string) => void;
  'data-zone'?: string;
}

export function FluidCardRow({
  cards,
  detail,
  emptyLabel,
  onSelect,
  'data-zone': dataZone,
}: FluidCardRowProps): ReactElement {
  if (cards.length === 0) {
    return <p className="text-xs text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <div
      {...(dataZone !== undefined ? { 'data-zone': dataZone } : {})}
      className="grid h-full min-h-[5.5rem] w-full gap-2 overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${String(cards.length)}, minmax(44px, 1fr))`,
        alignItems: 'center',
        justifyItems: 'stretch',
      }}
    >
      {cards.map((card) => (
        <Card
          key={card.instanceId}
          instance={card}
          detail={detail}
          className="max-h-full w-full min-w-0 !p-0.5"
          {...(onSelect !== undefined
            ? {
                onSelect: () => {
                  onSelect(card.instanceId);
                },
              }
            : {})}
        />
      ))}
    </div>
  );
}
