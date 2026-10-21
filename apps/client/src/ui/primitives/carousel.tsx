/**
 * Paged carousel for How to play and the Game over awards (technical spec v7 §4.2), following
 * the WAI-ARIA APG carousel: a region with `aria-roledescription="carousel"` and one named
 * `group` per slide (`aria-roledescription="slide"`).
 *
 * The track is a horizontal scroll-snap strip of full-width slides, so a swipe works natively.
 * Previous and Next scroll the track from their click handler, smoothly unless motion is
 * reduced (§8.3); a swipe reports its index from the scroll position. The chevrons stop click
 * and pointerdown from reaching an enclosing dismiss handler (a sheet backdrop). With
 * `gridAtDesktop`, the desktop layout mode (`viewportModeFor`, §6.4) shows every slide in a
 * grid with no paging controls.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { useViewportMode } from '../use-visual-viewport-box';
import { motionAttribute } from './chrome-classes';
import { IconButton } from './icon-button';

export interface CarouselSlide {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly dataAttributes?: Readonly<Record<`data-${string}`, string>>;
}

export interface CarouselProps {
  label: string;
  slides: readonly CarouselSlide[];
  index?: number;
  onIndexChange?: (index: number) => void;
  gridAtDesktop?: boolean;
  previousLabel: string;
  nextLabel: string;
}

function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

function slideOffset(track: HTMLElement, index: number): number | null {
  const slide = track.children.item(index);
  return slide instanceof HTMLElement ? slide.offsetLeft : null;
}

function stopPropagation(event: SyntheticEvent): void {
  event.stopPropagation();
}

function Slide({ slide }: { slide: CarouselSlide }): ReactElement {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={slide.label}
      {...slide.dataAttributes}
      className="w-full min-w-0 shrink-0 snap-start"
    >
      {slide.content}
    </div>
  );
}

export function Carousel({
  label,
  slides,
  index,
  onIndexChange,
  gridAtDesktop = false,
  previousLabel,
  nextLabel,
}: CarouselProps): ReactElement {
  const mode = useViewportMode();
  const reduced = usePrefersReducedMotion();
  const layout = gridAtDesktop && mode === 'desktop' ? 'grid' : 'track';
  const trackRef = useRef<HTMLDivElement>(null);
  const [ownIndex, setOwnIndex] = useState(() => clampIndex(index ?? 0, slides.length));
  const current = clampIndex(index ?? ownIndex, slides.length);
  /** The index last scrolled to or reported, so neither a scroll nor a prop echo repeats it. */
  const lastRequested = useRef(current);
  /** A paging scroll in flight: intermediate scroll positions must not report the old slide. */
  const pendingTarget = useRef<number | null>(null);
  const behavior = reduced ? 'auto' : 'smooth';

  function report(next: number): void {
    lastRequested.current = next;
    setOwnIndex(next);
    onIndexChange?.(next);
  }

  function page(step: 1 | -1): void {
    const target = clampIndex(current + step, slides.length);
    if (target === current) return;
    const track = trackRef.current;
    const left = track === null ? null : slideOffset(track, target);
    if (track !== null && left !== null) {
      pendingTarget.current = target;
      track.scrollTo({ left, behavior });
    }
    report(target);
  }

  // Place a non-zero starting slide before paint, with no animation.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (layout !== 'track' || track === null || lastRequested.current === 0) return;
    const left = slideOffset(track, lastRequested.current);
    if (left !== null) track.scrollLeft = left;
  }, [layout]);

  // A controlled index the carousel did not request itself scrolls the track to it.
  useEffect(() => {
    if (index === undefined || index === lastRequested.current) return;
    lastRequested.current = index;
    const track = trackRef.current;
    const left = track === null ? null : slideOffset(track, index);
    if (track === null || left === null) return;
    pendingTarget.current = index;
    track.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }, [index, reduced]);

  if (layout === 'grid') {
    return (
      <section aria-roledescription="carousel" aria-label={label} data-carousel-layout="grid">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-4">
          {slides.map((slide) => (
            <Slide key={slide.id} slide={slide} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      data-carousel-layout="track"
      className="flex min-w-0 flex-col gap-3"
    >
      <div
        ref={trackRef}
        data-carousel-track
        data-motion={motionAttribute(reduced)}
        onScroll={(event) => {
          const track = event.currentTarget;
          if (track.clientWidth <= 0) return;
          const derived = clampIndex(Math.round(track.scrollLeft / track.clientWidth), slides.length);
          if (pendingTarget.current !== null) {
            if (derived === pendingTarget.current) pendingTarget.current = null;
            return;
          }
          if (derived !== lastRequested.current) report(derived);
        }}
        onPointerDown={() => {
          pendingTarget.current = null;
        }}
        onWheel={() => {
          pendingTarget.current = null;
        }}
        className={[
          'relative flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          reduced ? '' : 'scroll-smooth',
        ].join(' ')}
      >
        {slides.map((slide) => (
          <Slide key={slide.id} slide={slide} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <IconButton
          aria-label={previousLabel}
          icon="chevron-left"
          disabled={current === 0}
          onPointerDown={stopPropagation}
          onClick={(event) => {
            event.stopPropagation();
            page(-1);
          }}
        />
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {slides.map((slide, slideIndex) => (
            <span
              key={slide.id}
              className={`h-2.5 rounded-full border-2 border-v7-ink ${
                slideIndex === current ? 'w-6 bg-v7-cta' : 'w-2.5 bg-v7-text-2'
              }`}
            />
          ))}
        </span>
        <IconButton
          aria-label={nextLabel}
          icon="chevron-right"
          disabled={current === slides.length - 1}
          onPointerDown={stopPropagation}
          onClick={(event) => {
            event.stopPropagation();
            page(1);
          }}
        />
      </div>
    </section>
  );
}
