// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { useViewportMode } from '../use-visual-viewport-box';
import { Carousel, type CarouselProps, type CarouselSlide } from './carousel';

vi.mock('../use-visual-viewport-box', () => ({ useViewportMode: vi.fn(() => 'portrait') }));
const viewportMode = vi.mocked(useViewportMode);

afterEach(() => {
  viewportMode.mockImplementation(() => 'portrait');
});

const SLIDES: readonly CarouselSlide[] = [
  { id: 'goal', label: 'Goal', content: 'Be the last player standing.' },
  { id: 'turns', label: 'Turns', content: 'Play one action per turn.', dataAttributes: { 'data-section': 'turns' } },
  { id: 'lives', label: 'Lives', content: 'Lose every life and you are out.' },
];

function setup(overrides: Partial<CarouselProps> = {}, options: { reducedMotion?: boolean } = {}) {
  const onIndexChange = vi.fn();
  const result = renderUi(
    <Carousel
      label="How to play"
      slides={SLIDES}
      previousLabel="Previous"
      nextLabel="Next"
      onIndexChange={onIndexChange}
      {...overrides}
    />,
    options,
  );
  const track = result.container.querySelector<HTMLElement>('[data-carousel-track]');
  const scrollTo = track === null ? null : vi.spyOn(track, 'scrollTo').mockImplementation(() => undefined);
  return { ...result, track, scrollTo, onIndexChange };
}

const previous = () => screen.getByRole('button', { name: 'Previous' });
const next = () => screen.getByRole('button', { name: 'Next' });
// End-stops stay focusable (aria-disabled, not native disabled) so paging to an end keeps focus (WCAG 2.4.3).
const isEndStop = (button: HTMLElement) => button.getAttribute('aria-disabled') === 'true';

/** Lays the slides out 300 px apart, as the browser would, so scroll positions map to slides. */
function stubSlideLayout(width = 300) {
  return vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    const siblings = this.parentElement === null ? [] : [...this.parentElement.children];
    return Math.max(siblings.indexOf(this), 0) * width;
  });
}

function scrollTrack(track: HTMLElement, left: number, width = 300): void {
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(track, 'scrollLeft', { configurable: true, value: left });
  fireEvent.scroll(track);
}

describe('Carousel (technical spec v7 §4.2: How to play, awards)', () => {
  it('is a labelled carousel with one named group per slide', () => {
    setup();
    const region = screen.getByRole('region', { name: 'How to play' });
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    const groups = screen.getAllByRole('group');
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Goal', 'Turns', 'Lives']);
    expect(groups[1]?.getAttribute('aria-roledescription')).toBe('slide');
    expect(groups[1]?.getAttribute('data-section')).toBe('turns');
  });

  it('Previous and Next page through the slides and report the index', async () => {
    const { user, onIndexChange } = setup();
    expect(isEndStop(previous())).toBe(true);
    await user.click(previous());
    expect(onIndexChange).not.toHaveBeenCalled();
    await user.click(next());
    await user.click(next());
    expect(isEndStop(next())).toBe(true);
    await user.click(next());
    await user.click(previous());
    expect(onIndexChange.mock.calls).toEqual([[1], [2], [1]]);
  });

  it('a controlled index drives the paging state', async () => {
    const { user, onIndexChange } = setup({ index: 2 });
    expect(isEndStop(next())).toBe(true);
    await user.click(next());
    expect(onIndexChange).not.toHaveBeenCalled();
    await user.click(previous());
    expect(onIndexChange.mock.calls).toEqual([[1]]);
  });

  it('keeps keyboard focus on Next when paging reaches the last slide (WCAG 2.4.3)', async () => {
    const { user, onIndexChange } = setup();
    next().focus();
    await user.keyboard('{Enter}{Enter}{Enter}');
    expect(document.activeElement).toBe(next());
    expect(isEndStop(next())).toBe(true);
    expect(next().hasAttribute('disabled')).toBe(false);
    expect(onIndexChange.mock.calls).toEqual([[1], [2]]);
  });

  it('places a starting slide instantly and reports nothing while it lands', () => {
    const offsets = stubSlideLayout();
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => undefined);
    try {
      const { container, onIndexChange } = setup({ index: 2 });
      expect(scrollTo).toHaveBeenCalledWith({ left: 600, behavior: 'instant' });
      const track = container.querySelector<HTMLElement>('[data-carousel-track]');
      if (track === null) throw new Error('no carousel track');
      // Even a UA that animated the placement must not report the slides it passes.
      for (const left of [0, 300, 600]) scrollTrack(track, left);
      expect(onIndexChange).not.toHaveBeenCalled();
    } finally {
      offsets.mockRestore();
      scrollTo.mockRestore();
    }
  });

  it('announces the position politely as it pages', async () => {
    const { user } = setup();
    expect(screen.getByRole('status').textContent).toBe('How to play, 1 of 3');
    await user.click(next());
    expect(screen.getByRole('status').textContent).toBe('How to play, 2 of 3');
  });

  it('keeps the scroll track out of the Tab order; the chevrons page it', () => {
    const { track } = setup();
    expect(track?.tabIndex).toBe(-1);
  });

  it('paging never bubbles a press to an enclosing dismiss handler', async () => {
    const onClick = vi.fn();
    const onPointerDown = vi.fn();
    const { user } = renderUi(
      <div onClick={onClick} onPointerDown={onPointerDown}>
        <Carousel label="How to play" slides={SLIDES} previousLabel="Previous" nextLabel="Next" />
      </div>,
    );
    await user.click(next());
    expect(onClick).not.toHaveBeenCalled();
    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it('pages with a smooth scroll when motion is full', async () => {
    const { user, track, scrollTo } = setup();
    await user.click(next());
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(track?.classList.contains('scroll-smooth')).toBe(true);
    expect(track?.getAttribute('data-motion')).toBe('full');
  });

  it('pages with an instant scroll under reduced motion (§8.3)', async () => {
    const { user, track, scrollTo } = setup({}, { reducedMotion: true });
    await user.click(next());
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    expect(track?.classList.contains('scroll-smooth')).toBe(false);
    expect(track?.getAttribute('data-motion')).toBe('reduced');
  });

  it('a swipe updates the index from the scroll position', async () => {
    const { user, track, onIndexChange } = setup();
    if (track === null) throw new Error('no carousel track');
    scrollTrack(track, 600);
    expect(onIndexChange.mock.calls).toEqual([[2]]);
    expect(isEndStop(next())).toBe(true);
    await user.click(next());
    expect(onIndexChange.mock.calls).toEqual([[2]]);
  });

  it('renders a grid with no paging controls at desktop when gridAtDesktop is set', () => {
    viewportMode.mockImplementation(() => 'desktop');
    const { container } = setup({ gridAtDesktop: true });
    expect(container.querySelector('[data-carousel-layout="grid"]')).not.toBeNull();
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('region', { name: 'How to play' }).hasAttribute('aria-roledescription')).toBe(false);
  });

  it('picks desktop grid columns from the slide count, so four slides make 2 by 2', () => {
    viewportMode.mockImplementation(() => 'desktop');
    const { container, rerender } = setup({ gridAtDesktop: true });
    expect(container.querySelector('[data-carousel-layout="grid"] > div')?.classList.contains('grid-cols-3')).toBe(true);
    const four = [...SLIDES, { id: 'shop', label: 'Shop', content: 'Spend points.' }];
    rerender(<Carousel label="How to play" slides={four} gridAtDesktop previousLabel="Previous" nextLabel="Next" />);
    expect(container.querySelector('[data-carousel-layout="grid"] > div')?.classList.contains('grid-cols-2')).toBe(true);
  });

  it('stays a carousel at desktop without gridAtDesktop', () => {
    viewportMode.mockImplementation(() => 'desktop');
    const { container } = setup();
    expect(container.querySelector('[data-carousel-layout="track"]')).not.toBeNull();
    expect(next()).toBeTruthy();
  });
});
