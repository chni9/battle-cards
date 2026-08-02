/**
 * Shared-size card band — hand + specials never overflow or crop.
 * Each section measures its own area; cards shrink to fit 1–2 rows, then paginate.
 */

import { type CardInstance } from '@card-battle/shared';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { Card } from '../../design/components/card';
import { CARD_BAND_GAP_PX, fitCardBand } from './card-band-fit';

export interface CardBandProps {
  hand: readonly CardInstance[];
  specials: readonly CardInstance[];
  onSelect?: (instanceId: string) => void;
}

function CardSection({
  label,
  zone,
  cards,
  onSelect,
}: {
  label: string;
  zone: string;
  cards: readonly CardInstance[];
  onSelect?: (instanceId: string) => void;
}): ReactElement {
  const areaRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(40);
  const [pageSize, setPageSize] = useState(Math.max(1, cards.length));
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (el === null) {
      return;
    }

    const measure = (): void => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0 || cards.length === 0) {
        return;
      }
      const fit = fitCardBand(cards.length, w, h);
      setCardWidth((prev) =>
        Math.abs(prev - fit.cardWidth) < 0.5 ? prev : fit.cardWidth,
      );
      setPageSize((prev) => (prev === fit.pageSize ? prev : fit.pageSize));
    };

    measure();
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [cards.length]);

  const pageCount = Math.max(1, Math.ceil(cards.length / Math.max(1, pageSize)));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = cards.slice(start, start + pageSize);
  const needsPager = cards.length > pageSize;

  if (cards.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-col items-center gap-0.5">
        <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted sm:text-[10px]">
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
        ref={areaRef}
        data-zone={zone}
        className="flex min-h-0 w-full flex-1 flex-wrap content-center items-center justify-center overflow-hidden"
        style={{ gap: CARD_BAND_GAP_PX }}
      >
        {visible.map((card) => (
          <div
            key={card.instanceId}
            style={{ width: cardWidth, maxHeight: '100%' }}
            className="shrink-0 overflow-hidden"
          >
            <Card
              instance={card}
              detail="face"
              className="w-full max-h-full !p-0.5"
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
              setPage((p) =>
                Math.min(pageCount - 1, Math.min(p, pageCount - 1) + 1),
              );
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
  return (
    <div
      data-zone="card-band"
      className="flex h-full min-h-0 w-full flex-col justify-end gap-1 overflow-hidden"
    >
      <CardSection
        label="Hand"
        zone="hand"
        cards={hand}
        {...(onSelect !== undefined ? { onSelect } : {})}
      />
      <CardSection
        label="Specials"
        zone="specials"
        cards={specials}
        {...(onSelect !== undefined ? { onSelect } : {})}
      />
    </div>
  );
}
