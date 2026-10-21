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
const isDisabled = (button: HTMLElement) => button.hasAttribute('disabled');

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
    expect(isDisabled(previous())).toBe(true);
    await user.click(next());
    await user.click(next());
    expect(isDisabled(next())).toBe(true);
    await user.click(previous());
    expect(onIndexChange.mock.calls).toEqual([[1], [2], [1]]);
  });

  it('a controlled index drives the paging state', async () => {
    const { user, onIndexChange } = setup({ index: 2 });
    expect(isDisabled(next())).toBe(true);
    await user.click(previous());
    expect(onIndexChange.mock.calls).toEqual([[1]]);
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

  it('a swipe updates the index from the scroll position', () => {
    const { track, onIndexChange } = setup();
    if (track === null) throw new Error('no carousel track');
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 600 });
    fireEvent.scroll(track);
    expect(onIndexChange.mock.calls).toEqual([[2]]);
    expect(isDisabled(next())).toBe(true);
  });

  it('renders a grid with no paging controls at desktop when gridAtDesktop is set', () => {
    viewportMode.mockImplementation(() => 'desktop');
    const { container } = setup({ gridAtDesktop: true });
    expect(container.querySelector('[data-carousel-layout="grid"]')).not.toBeNull();
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('stays a carousel at desktop without gridAtDesktop', () => {
    viewportMode.mockImplementation(() => 'desktop');
    const { container } = setup();
    expect(container.querySelector('[data-carousel-layout="track"]')).not.toBeNull();
    expect(next()).toBeTruthy();
  });
});
