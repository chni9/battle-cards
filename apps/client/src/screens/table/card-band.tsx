/**
 * Shared-size card band — hand + specials use the same face width.
 * Width is capped so cards stay readable, not viewport-tall.
 */

import { type CardInstance } from '@card-battle/shared';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { Card } from '../../design/components/card';

const GAP_PX = 8;
const SECTION_GAP_PX = 16;
const MIN_W = 48;
/** Cap so faces don't dominate the dock (user: cards too big). */
const MAX_W = 72;

export interface CardBandProps {
  hand: readonly CardInstance[];
  specials: readonly CardInstance[];
  onSelect?: (instanceId: string) => void;
}

export function CardBand({ hand, specials, onSelect }: CardBandProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(64);
  const total = hand.length + specials.length;

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || total === 0) {
      return;
    }

    const measure = (): void => {
      const width = el.clientWidth;
      if (width <= 0) {
        return;
      }
      const gaps = GAP_PX * Math.max(0, total - 1) + (specials.length > 0 && hand.length > 0 ? SECTION_GAP_PX : 0);
      const byWidth = (width - gaps) / total;
      const next = Math.max(MIN_W, Math.min(MAX_W, byWidth));
      setCardWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };

    measure();
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [total, hand.length, specials.length]);

  function renderCards(
    cards: readonly CardInstance[],
    zone: string,
  ): ReactElement {
    if (cards.length === 0) {
      return (
        <p className="text-xs text-ink-muted" data-zone={zone}>
          {zone === 'hand' ? 'Empty' : 'None'}
        </p>
      );
    }
    return (
      <div data-zone={zone} className="flex flex-wrap items-end justify-center gap-2">
        {cards.map((card) => (
          <div key={card.instanceId} style={{ width: cardWidth }} className="shrink-0">
            <Card
              instance={card}
              detail="face"
              className="w-full !p-0.5"
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

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 w-full items-end justify-center gap-4 overflow-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-col items-center gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          Hand
        </p>
        {renderCards(hand, 'hand')}
      </div>
      <div
        className="hidden h-[70%] w-px shrink-0 self-center bg-border-soft sm:block"
        aria-hidden
      />
      <div className="flex min-h-0 min-w-0 flex-col items-center gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          Specials
        </p>
        {renderCards(specials, 'specials')}
      </div>
    </div>
  );
}
