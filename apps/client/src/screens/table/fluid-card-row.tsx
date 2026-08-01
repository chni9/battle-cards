/**
 * Fluid card row — sizes faces to fill available width/height (no empty strip).
 * Table private zone only; no rule logic.
 */

import { type CardInstance } from '@card-battle/shared';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { Card } from '../../design/components/card';

const GAP_PX = 6;
const MIN_W = 40;
/** face: art 2/3 + name; thumb: art only. */
const FACE_HEIGHT_FACTOR = 1.72;
const THUMB_HEIGHT_FACTOR = 1.5;

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
  const ref = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(64);
  const heightFactor = detail === 'thumb' ? THUMB_HEIGHT_FACTOR : FACE_HEIGHT_FACTOR;

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) {
      return;
    }

    const measure = (): void => {
      const count = cards.length;
      if (count === 0) {
        return;
      }
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) {
        return;
      }
      const byWidth = (width - GAP_PX * (count - 1)) / count;
      const byHeight = height / heightFactor;
      const next = Math.max(MIN_W, Math.min(byWidth, byHeight));
      setCardWidth(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [cards.length, heightFactor]);

  if (cards.length === 0) {
    return <p className="text-xs text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <div
      ref={ref}
      {...(dataZone !== undefined ? { 'data-zone': dataZone } : {})}
      className="flex h-full min-h-0 w-full items-center justify-center gap-1.5 overflow-hidden"
    >
      {cards.map((card) => (
        <div
          key={card.instanceId}
          className="flex h-full min-h-0 shrink-0 justify-center"
          style={{ width: cardWidth }}
        >
          <Card
            instance={card}
            detail={detail}
            className="h-full w-full max-h-full p-0.5"
            {...(onSelect !== undefined
              ? {
                  onSelect: () => {
                    onSelect(card.instanceId);
                  },
                }
              : {})}
          />
        </div>
      ))}
    </div>
  );
}
