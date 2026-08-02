/**
 * Shared-size card band — hand + specials never overflow the dock.
 * Fits 1–2 rows; paginates only when even 2 rows at min width cannot hold all cards.
 */

import { type CardInstance } from '@card-battle/shared';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { Card } from '../../design/components/card';
import {
  CARD_BAND_GAP_PX,
  CARD_BAND_MAX_W,
  fitCardBand,
} from './card-band-fit';

const LABEL_H = 14;
const PAGER_H = 22;
const SECTION_GAP_PX = 8;

export interface CardBandProps {
  hand: readonly CardInstance[];
  specials: readonly CardInstance[];
  onSelect?: (instanceId: string) => void;
}

function CardSection({
  label,
  zone,
  cards,
  cardWidth,
  pageSize,
  onSelect,
}: {
  label: string;
  zone: string;
  cards: readonly CardInstance[];
  cardWidth: number;
  pageSize: number;
  onSelect?: (instanceId: string) => void;
}): ReactElement {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(cards.length / Math.max(1, pageSize)));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = cards.slice(start, start + pageSize);
  const needsPager = cards.length > pageSize;

  if (cards.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-col items-center gap-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted sm:text-[10px]">
          {label}
        </p>
        <p className="text-xs text-ink-muted" data-zone={zone}>
          {zone === 'hand' ? 'Empty' : 'None'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-0.5 overflow-hidden">
      <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted sm:text-[10px]">
        {label}
      </p>
      <div
        data-zone={zone}
        className="flex min-h-0 w-full flex-1 flex-wrap content-end items-end justify-center overflow-hidden"
        style={{ gap: CARD_BAND_GAP_PX }}
      >
        {visible.map((card) => (
          <div
            key={card.instanceId}
            style={{ width: cardWidth }}
            className="shrink-0"
          >
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
      {needsPager ? (
        <div
          className="flex shrink-0 items-center gap-2"
          data-zone={`${zone}-pager`}
        >
          <button
            type="button"
            className="rounded-[length:var(--radius-badge)] bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink disabled:opacity-40"
            disabled={safePage <= 0}
            aria-label={`Previous ${label} page`}
            onClick={() => {
              setPage((p) => Math.max(0, Math.min(p, pageCount - 1) - 1));
            }}
          >
            ‹
          </button>
          <span className="text-[10px] tabular-nums text-ink-muted">
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            className="rounded-[length:var(--radius-badge)] bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink disabled:opacity-40"
            disabled={safePage >= pageCount - 1}
            aria-label={`Next ${label} page`}
            onClick={() => {
              setPage((p) => Math.min(pageCount - 1, Math.min(p, pageCount - 1) + 1));
            }}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CardBand({ hand, specials, onSelect }: CardBandProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(56);
  const [handPageSize, setHandPageSize] = useState(Math.max(1, hand.length));
  const [specialPageSize, setSpecialPageSize] = useState(
    Math.max(1, specials.length),
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) {
      return;
    }

    const measure = (): void => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) {
        return;
      }

      const hasHand = hand.length > 0;
      const hasSpecials = specials.length > 0;
      const sectionCount = (hasHand ? 1 : 0) + (hasSpecials ? 1 : 0);
      if (sectionCount === 0) {
        return;
      }

      const both = hasHand && hasSpecials;
      const chromePerSection = LABEL_H + PAGER_H * 0.35;
      const available =
        height - chromePerSection * sectionCount - (both ? SECTION_GAP_PX : 0);
      const handShare = both
        ? available * (hand.length / (hand.length + specials.length))
        : available;
      const specialShare = both
        ? available * (specials.length / (hand.length + specials.length))
        : available;

      const handFit = fitCardBand(
        Math.max(1, hand.length),
        width,
        Math.max(24, handShare),
      );
      const specialFit = fitCardBand(
        Math.max(1, specials.length),
        width,
        Math.max(24, specialShare),
      );

      const nextWidth = Math.min(
        hasHand ? handFit.cardWidth : CARD_BAND_MAX_W,
        hasSpecials ? specialFit.cardWidth : CARD_BAND_MAX_W,
      );

      setCardWidth((prev) => (Math.abs(prev - nextWidth) < 0.5 ? prev : nextWidth));
      setHandPageSize(hasHand ? handFit.pageSize : 1);
      setSpecialPageSize(hasSpecials ? specialFit.pageSize : 1);
    };

    measure();
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hand.length, specials.length]);

  return (
    <div
      ref={ref}
      data-zone="card-band"
      className="flex h-full min-h-0 w-full flex-col justify-end gap-1 overflow-hidden"
    >
      <CardSection
        key={`hand-${String(handPageSize)}-${String(hand.length)}`}
        label="Hand"
        zone="hand"
        cards={hand}
        cardWidth={cardWidth}
        pageSize={handPageSize}
        {...(onSelect !== undefined ? { onSelect } : {})}
      />
      <CardSection
        key={`specials-${String(specialPageSize)}-${String(specials.length)}`}
        label="Specials"
        zone="specials"
        cards={specials}
        cardWidth={cardWidth}
        pageSize={specialPageSize}
        {...(onSelect !== undefined ? { onSelect } : {})}
      />
    </div>
  );
}
