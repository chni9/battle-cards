/**
 * Shared-size card band — one row each for hand and specials, horizontal scroll.
 * Width is measured once on the parent so Specials cannot outgrow Hand (L53-07).
 */

import { type CardInstance } from '@card-battle/shared';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { AnimatedCard } from '../../design/components/animated-card';
import {
  CARD_BAND_ABS_MIN_W,
  CARD_BAND_GAP_PX,
  cardBandRowHeight,
  fitCardBand,
} from './card-band-fit';
import { TutorialCallout } from './tutorial-callout';

export interface CardBandProps {
  hand: readonly CardInstance[];
  specials: readonly CardInstance[];
  onSelect?: (instanceId: string) => void;
  highlightedInstanceIds?: readonly string[];
  /** Board-tour section pulse (hand vs specials). */
  highlightedSection?: 'hand' | 'specials';
}

function CardSection({
  label,
  zone,
  cards,
  fill,
  cardWidth,
  onSelect,
  highlightedInstanceIds = [],
  spotlightSection = false,
}: {
  label: string;
  zone: string;
  cards: readonly CardInstance[];
  fill: boolean;
  cardWidth: number;
  onSelect?: (instanceId: string) => void;
  highlightedInstanceIds?: readonly string[];
  spotlightSection?: boolean;
}): ReactElement {
  if (cards.length === 0) {
    return wrapSection(
      spotlightSection,
      zone,
      <div className="flex min-h-0 min-w-0 shrink-0 flex-col items-center gap-0.5">
        <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted sm:text-[10px]">
          {label}
        </p>
        <p
          className="text-xs text-ink-muted"
          data-zone={zone}
          data-hint-anchor={zone}
        >
          {zone === 'hand' ? 'Empty' : 'None'}
        </p>
      </div>,
    );
  }

  const spotlighted = highlightedInstanceIds.length > 0 || spotlightSection;

  return wrapSection(
    spotlightSection,
    zone,
    <div
      className={[
        'flex min-h-0 min-w-0 flex-col items-stretch gap-0.5',
        fill ? 'flex-1' : 'shrink-0',
        spotlighted ? 'overflow-visible' : 'overflow-hidden',
      ].join(' ')}
    >
      <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted sm:text-[10px]">
        {label}
      </p>
      <div
        data-zone={zone}
        data-card-row
        data-hint-anchor={zone}
        className={[
          'inline-flex max-w-full min-h-0 w-full flex-nowrap items-start justify-start',
          fill ? 'flex-1' : '',
          spotlighted ? 'overflow-visible' : 'overflow-x-auto overflow-y-hidden',
        ].join(' ')}
        style={{ gap: CARD_BAND_GAP_PX }}
      >
        {cards.map((card) => {
          const highlighted = highlightedInstanceIds.includes(card.instanceId);
          return (
            <div
              key={card.instanceId}
              style={{ width: cardWidth }}
              className={[
                'h-auto shrink-0 rounded-[length:var(--radius-card)]',
                highlighted ? 'overflow-visible' : 'overflow-hidden',
              ].join(' ')}
            >
              <TutorialCallout
                active={highlighted}
                arrow="top"
                highlightId={card.cardId}
                className="w-full"
              >
                <AnimatedCard
                  instance={card}
                  detail="face"
                  skipEntrance
                  selected={highlighted}
                  className="w-full !max-h-none !p-0.5"
                  {...(onSelect !== undefined
                    ? {
                        onSelect: () => {
                          onSelect(card.instanceId);
                        },
                      }
                    : {})}
                />
              </TutorialCallout>
            </div>
          );
        })}
      </div>
    </div>,
  );
}

function wrapSection(
  spotlightSection: boolean,
  zone: string,
  body: ReactElement,
): ReactElement {
  if (!spotlightSection) {
    return body;
  }

  return (
    <TutorialCallout
      active
      layout="stretch"
      arrow="top"
      highlightId={zone}
      className="min-h-0 w-full flex-1 overflow-visible pt-10"
    >
      {body}
    </TutorialCallout>
  );
}

export function CardBand({
  hand,
  specials,
  onSelect,
  highlightedInstanceIds,
  highlightedSection,
}: CardBandProps): ReactElement {
  const bandRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(CARD_BAND_ABS_MIN_W);
  const sectionLit = highlightedSection !== undefined;

  useLayoutEffect(() => {
    const el = bandRef.current;
    if (el === null) {
      return;
    }

    const measure = (): void => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) {
        return;
      }
      const rowHeight = cardBandRowHeight(h, specials.length);
      const fit = fitCardBand(Math.max(hand.length, 1), w, rowHeight);
      setCardWidth((prev) =>
        Math.abs(prev - fit.cardWidth) < 0.5 ? prev : fit.cardWidth,
      );
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
      ref={bandRef}
      data-zone="card-band"
      className={[
        'flex h-full min-h-0 w-full flex-col justify-end gap-1',
        (highlightedInstanceIds !== undefined && highlightedInstanceIds.length > 0) ||
        sectionLit
          ? 'overflow-visible'
          : 'overflow-hidden',
      ].join(' ')}
    >
      <CardSection
        label="Hand"
        zone="hand"
        cards={hand}
        fill
        cardWidth={cardWidth}
        spotlightSection={highlightedSection === 'hand'}
        {...(onSelect !== undefined ? { onSelect } : {})}
        {...(highlightedInstanceIds !== undefined ? { highlightedInstanceIds } : {})}
      />
      <CardSection
        label="Specials"
        zone="specials"
        cards={specials}
        fill={false}
        cardWidth={cardWidth}
        spotlightSection={highlightedSection === 'specials'}
        {...(onSelect !== undefined ? { onSelect } : {})}
        {...(highlightedInstanceIds !== undefined ? { highlightedInstanceIds } : {})}
      />
    </div>
  );
}
