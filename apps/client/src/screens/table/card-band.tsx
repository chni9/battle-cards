/**
 * Shared-size card band — hand + specials wrap and scroll, never shrink below 64px.
 * Specials size to content; Hand fills leftover height (Lot 53).
 */

import { type CardInstance } from '@card-battle/shared';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { AnimatedCard } from '../../design/components/animated-card';
import { CARD_BAND_GAP_PX, fitCardBand } from './card-band-fit';
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
  onSelect,
  highlightedInstanceIds = [],
  spotlightSection = false,
}: {
  label: string;
  zone: string;
  cards: readonly CardInstance[];
  fill: boolean;
  onSelect?: (instanceId: string) => void;
  highlightedInstanceIds?: readonly string[];
  spotlightSection?: boolean;
}): ReactElement {
  const areaRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(64);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (el === null) {
      return;
    }

    const measure = (): void => {
      const w = el.clientWidth;
      if (w <= 0 || cards.length === 0) {
        return;
      }
      const fit = fitCardBand(cards.length, w);
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
  }, [cards.length]);

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
        fill ? 'flex-1' : 'max-h-[50%] shrink-0',
        spotlighted ? 'overflow-visible' : 'overflow-hidden',
      ].join(' ')}
    >
      <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted sm:text-[10px]">
        {label}
      </p>
      <div
        ref={areaRef}
        data-zone={zone}
        className={[
          'min-h-0 w-full',
          fill ? 'flex-1' : '',
          spotlighted ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden',
        ].join(' ')}
      >
        <div
          data-hint-anchor={zone}
          className={[
            'inline-flex max-w-full flex-wrap content-start items-start justify-start',
            spotlighted ? 'overflow-visible' : '',
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
                  'shrink-0 rounded-[length:var(--radius-card)]',
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
                    className="w-full !p-0.5"
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
  const sectionLit = highlightedSection !== undefined;

  return (
    <div
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
        spotlightSection={highlightedSection === 'hand'}
        {...(onSelect !== undefined ? { onSelect } : {})}
        {...(highlightedInstanceIds !== undefined ? { highlightedInstanceIds } : {})}
      />
      <CardSection
        label="Specials"
        zone="specials"
        cards={specials}
        fill={false}
        spotlightSection={highlightedSection === 'specials'}
        {...(onSelect !== undefined ? { onSelect } : {})}
        {...(highlightedInstanceIds !== undefined ? { highlightedInstanceIds } : {})}
      />
    </div>
  );
}
