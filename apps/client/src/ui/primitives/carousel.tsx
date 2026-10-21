/**
 * Paged carousel for How to play and the Game over awards (technical spec v7 §4.2), following
 * the WAI-ARIA APG carousel: a region with `aria-roledescription="carousel"`, one named
 * `group` per slide (`aria-roledescription="slide"`) and a polite status line that reads
 * "{label}, {n} of {m}" as the slide changes.
 *
 * The track is a horizontal scroll-snap strip of full-width slides, so a swipe works natively.
 * It stays out of the Tab order: the chevrons page it and the status line names the position.
 * Previous and Next scroll the track from their click handler, smoothly unless motion is
 * reduced (§8.3); a swipe reports its index from the scroll position. A starting slide is
 * placed with an instant scroll, which overrides the track's `scroll-smooth`, so it neither
 * animates nor reports the slides in between. At either end the chevron is `aria-disabled`
 * rather than `disabled`, so keyboard focus stays on it (WCAG 2.4.3). The chevrons stop click
 * and pointerdown from reaching an enclosing dismiss handler (a sheet backdrop).
 *
 * With `gridAtDesktop`, the desktop layout mode (`viewportModeFor`, §6.4) shows every slide in
 * a grid with no paging controls and no carousel semantics; the column count follows the slide
 * count so no slide is left alone on a row (four make two by two).
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
import { carouselPositionLabel } from '../ui-copy';
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

/**
 * Scroll the track to a slide. When the track really moves, `pending` holds the target until
 * a scroll event lands on it, so intermediate positions never report the slides passed over.
 * A track already in place sets no guard, because no scroll event would come to clear it.
 */
function scrollTrackTo(
  track: HTMLElement,
  index: number,
  pending: { current: number | null },
  behavior: ScrollBehavior,
): void {
  const left = slideOffset(track, index);
  if (left === null) return;
  if (Math.abs(track.scrollLeft - left) >= 1) pending.current = index;
  track.scrollTo({ left, behavior });
}

function stopPropagation(event: SyntheticEvent): void {
  event.stopPropagation();
}

/** Desktop grid columns that never leave one slide alone on the last row. */
const GRID_COLUMNS_CLASS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

function gridColumnsFor(count: number): keyof typeof GRID_COLUMNS_CLASS {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  if (count === 3) return 3;
  return count % 3 === 1 ? 4 : 3;
}

function Slide({ slide, inCarousel }: { slide: CarouselSlide; inCarousel: boolean }): ReactElement {
  return (
    <div
      role="group"
      {...(inCarousel ? { 'aria-roledescription': 'slide' } : {})}
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
  /** A scroll in flight: intermediate scroll positions must not report the slides passed over. */
  const pendingTarget = useRef<number | null>(null);
  const behavior = reduced ? 'auto' : 'smooth';
  const atStart = current === 0;
  const atEnd = current === slides.length - 1;

  function report(next: number): void {
    lastRequested.current = next;
    setOwnIndex(next);
    onIndexChange?.(next);
  }

  // An end-stop chevron is aria-disabled, never disabled, so activating it lands here and stays put.
  function page(step: 1 | -1): void {
    const target = clampIndex(current + step, slides.length);
    if (target === current) return;
    const track = trackRef.current;
    if (track !== null) scrollTrackTo(track, target, pendingTarget, behavior);
    report(target);
  }

  // Place a non-zero starting slide before paint. 'instant' overrides the track's scroll-smooth,
  // which a plain scrollLeft assignment would follow (animating from 0 and reporting 0, 1, ...).
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (layout !== 'track' || track === null || lastRequested.current === 0) return;
    scrollTrackTo(track, lastRequested.current, pendingTarget, 'instant');
  }, [layout]);

  // A controlled index the carousel did not request itself scrolls the track to it.
  useEffect(() => {
    if (index === undefined || index === lastRequested.current) return;
    lastRequested.current = index;
    const track = trackRef.current;
    if (track !== null) scrollTrackTo(track, index, pendingTarget, reduced ? 'auto' : 'smooth');
  }, [index, reduced]);

  if (layout === 'grid') {
    return (
      <section aria-label={label} data-carousel-layout="grid">
        <div className={`grid gap-4 ${GRID_COLUMNS_CLASS[gridColumnsFor(slides.length)]}`}>
          {slides.map((slide) => (
            <Slide key={slide.id} slide={slide} inCarousel={false} />
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
        tabIndex={-1}
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
          'relative flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain outline-none',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          reduced ? '' : 'scroll-smooth',
        ].join(' ')}
      >
        {slides.map((slide) => (
          <Slide key={slide.id} slide={slide} inCarousel />
        ))}
      </div>
      <p role="status" className="sr-only">
        {carouselPositionLabel(label, current + 1, slides.length)}
      </p>
      <div className="flex items-center justify-between gap-3">
        <IconButton
          aria-label={previousLabel}
          icon="chevron-left"
          {...(atStart ? { 'aria-disabled': true } : {})}
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
          {...(atEnd ? { 'aria-disabled': true } : {})}
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
