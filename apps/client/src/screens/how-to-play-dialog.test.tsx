// @vitest-environment happy-dom
/**
 * How to play as a V7 card carousel: technical spec v7 §7.1, §5.6, §8.3, §6.7; Appendix A
 * `home-how-to-play-dialog`, `home-how-to-play-dismiss`, `global-dialog-interaction-contract`; v6 §5.1
 * (L51-02) and the L76-03 Kits copy (L76-06).
 */
import { screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { stubPhoneViewport, swipeCarouselTo, swipeSheetDown } from '../test/sheet-gestures';
import { HOW_TO_PLAY_SECTIONS } from './how-to-play-content';
import { HowToPlayDialog, type HowToPlayCloseReason } from './how-to-play-dialog';

/** Designer PNGs a test pretends exist; the real lookup finds none (how-to-play-content.test.ts). */
const shots = vi.hoisted(() => ({ files: new Set<string>() }));
vi.mock('./how-to-play-screenshots', () => ({
  howToPlayScreenshotUrl: (fileName: string): string | null => (shots.files.has(fileName) ? `/how-to-play/${fileName}` : null),
}));

const TITLE = 'How to play';
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: TITLE });
const cards = (): HTMLElement[] => within(sheet()).getAllByRole('group');
const status = (): string | null => within(sheet()).getByRole('status').textContent;
const button = (name: string): HTMLElement => within(sheet()).getByRole('button', { name });
/** Screenshot images only: the card art row is `aria-hidden` and holds base-art `<img>`s of its own. */
const screenshots = (): HTMLImageElement[] =>
  Array.from(sheet().querySelectorAll('img')).filter((img) => img.closest('[data-how-to-play-renders]') === null);
const cardOf = (sectionId: string): HTMLElement => {
  const found = cards().find((card) => card.getAttribute('data-how-to-play-section') === sectionId);
  if (found === undefined) throw new Error(`no ${sectionId} card`);
  return found;
};
function renderOpen(options: { reducedMotion?: boolean } = { reducedMotion: true }) {
  const onClose = vi.fn<(reason: HowToPlayCloseReason) => void>();
  return { onClose, ...renderUi(<HowToPlayDialog open onClose={onClose} />, options) };
}
/** The callers' wiring: every onClose closes the sheet. */
function Harness({ onClose }: { readonly onClose: (reason: HowToPlayCloseReason) => void }): ReactElement {
  const [open, setOpen] = useState(true);
  return <HowToPlayDialog open={open} onClose={(reason) => { onClose(reason); setOpen(false); }} />;
}

beforeEach(() => { shots.files.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('How to play cards (spec v7 §7.1)', () => {
  it('shows one card per section in order, the copy verbatim, under the primer line', () => {
    renderOpen();
    expect(within(sheet()).getByText('This is a short primer — not the full rules.')).toBeTruthy();
    expect(cards().map((card) => [card.getAttribute('aria-label'), card.getAttribute('data-how-to-play-section')]))
      .toEqual(HOW_TO_PLAY_SECTIONS.map((section) => [section.title, section.id]));
    expect(cards().map((card) => within(card).getByRole('heading', { level: 3 }).textContent))
      .toEqual(HOW_TO_PLAY_SECTIONS.map((section) => section.title));
    expect(HOW_TO_PLAY_SECTIONS.map((section, index) => cards()[index]?.contains(within(sheet()).getByText(section.body))))
      .toEqual(HOW_TO_PLAY_SECTIONS.map(() => true));
    expect(status()).toBe('How to play, 1 of 9');
  });

  it('puts the resource icons on the Lives, Points and Upgrade cards only', () => {
    renderOpen();
    const iconsOf = (card: HTMLElement) =>
      Array.from(card.querySelectorAll('[data-how-to-play-icons] li'), (li) => [li.querySelector('[data-icon]')?.getAttribute('data-icon'), li.textContent]);
    expect(Object.fromEntries(cards().map((card) => [card.getAttribute('data-how-to-play-section') ?? '', iconsOf(card)]))).toEqual({
      goal: [], turn: [], lives: [['life', 'Lives'], ['shield', 'Shield']], points: [['point', 'Points']],
      cards: [], upgrade: [['upgrade', 'Upgrade points']], kits: [], specials: [], shop: [],
    });
  });

  it('renders the card art row on the Cards, Upgrade, Kits and Special cards slides only, hidden from assistive tech', () => {
    renderOpen();
    const rowsOf = (card: HTMLElement) =>
      Array.from(card.querySelectorAll('[data-how-to-play-renders]'), (row) => [
        row.getAttribute('aria-hidden'),
        Array.from(row.querySelectorAll('[data-card-id]'), (face) => face.getAttribute('data-card-id')),
        Array.from(row.querySelectorAll('[data-kit-face]'), (face) => face.getAttribute('data-kit-face')),
      ]);
    expect(Object.fromEntries(cards().map((card) => [card.getAttribute('data-how-to-play-section') ?? '', rowsOf(card)]))).toEqual({
      goal: [], turn: [], lives: [], points: [],
      cards: [['true', ['basic-attack', 'shield'], []]],
      upgrade: [['true', ['basic-attack', 'basic-attack'], []]],
      kits: [['true', [], ['random']]],
      specials: [['true', ['block'], []]],
      shop: [],
    });
  });

  it('shows the upgraded Basic Attack beside the base one on the Upgrade slide', () => {
    renderOpen();
    const faces = Array.from(cardOf('upgrade').querySelectorAll('[data-how-to-play-renders] [data-card-id="basic-attack"]'));
    expect(faces.map((face) => [face.getAttribute('data-instance-id'), face.querySelector('[data-card-badge="upgraded"]') !== null]))
      .toEqual([['how-to-play:basic-attack', false], ['how-to-play:basic-attack:upgraded', true]]);
  });

  it('renders no screenshot img while the designer files are absent', () => {
    renderOpen();
    expect(screenshots()).toHaveLength(0);
  });

  it('renders a screenshot only on the card whose file exists, as decoration', () => {
    shots.files.add('shop.png');
    renderOpen();
    expect(screenshots().map((img) => [
      img.closest('[data-how-to-play-section]')?.getAttribute('data-how-to-play-section'), img.getAttribute('src'), img.getAttribute('alt'),
    ])).toEqual([['shop', '/how-to-play/shop.png', '']]);
  });
});

describe('How to play paging (spec v7 §7.1, §8.3)', () => {
  it('pages by the chevrons, the keyboard and a swipe, announces the position, and never closes', async () => {
    const { user, onClose } = renderOpen();
    await user.click(button('Next'));
    expect(status()).toBe('How to play, 2 of 9');
    button('Next').focus();
    await user.keyboard('{Enter}');
    expect(status()).toBe('How to play, 3 of 9');
    await user.click(button('Previous'));
    expect(status()).toBe('How to play, 2 of 9');
    swipeCarouselTo(sheet(), 8);
    expect(status()).toBe('How to play, 9 of 9');
    await user.click(button('Next')); // the end stop pages nowhere and closes nothing
    expect(status()).toBe('How to play, 9 of 9');
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet()).toBeTruthy();
  });

  it.each([
    [true, 'reduced', 'auto', false],
    [false, 'full', 'smooth', true],
  ] as const)('with reduced motion %s the track is %s and pages with an %s scroll', async (reducedMotion, motion, behavior, smooth) => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => undefined);
    try {
      const { user } = renderOpen({ reducedMotion });
      const track = sheet().querySelector<HTMLElement>('[data-carousel-track]');
      if (track === null) throw new Error('no carousel track');
      expect([track.getAttribute('data-motion'), track.classList.contains('scroll-smooth'), sheet().getAttribute('data-motion')])
        .toEqual([motion, smooth, motion]);
      await user.click(button('Next'));
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior }));
    } finally {
      scrollTo.mockRestore();
    }
  });
});

describe('How to play closing (spec v7 §7.1, §7.7, §6.7)', () => {
  it.each([
    ['Skip', 'skip'], ['Got it', 'got-it'], ['Escape', 'dismiss'], ['backdrop', 'dismiss'], ['swipe', 'dismiss'],
  ] as const)('%s reports %s once and closes the sheet', async (way, reason) => {
    stubPhoneViewport(); // a bottom sheet with its swipe handle, whatever the default window
    const onClose = vi.fn<(reason: HowToPlayCloseReason) => void>();
    const { user } = renderUi(<Harness onClose={onClose} />, { reducedMotion: true });
    const dialog = sheet();
    if (way === 'Escape') {
      await user.keyboard('{Escape}');
    } else if (way === 'swipe') {
      swipeSheetDown(dialog);
    } else if (way === 'backdrop') {
      const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
      if (overlay === null) throw new Error('no backdrop');
      await user.click(overlay);
    } else {
      await user.click(within(dialog).getByRole('button', { name: way }));
    }
    expect(onClose.mock.calls).toEqual([[reason]]);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: TITLE, hidden: true })).toBeNull(); });
  });

  it('calls onClose once per open: a double Skip and a later Esc count once until it reopens', async () => {
    const { user, rerender, onClose } = renderOpen();
    await user.dblClick(button('Skip'));
    await user.keyboard('{Escape}');
    expect(onClose.mock.calls).toEqual([['skip']]);
    rerender(<HowToPlayDialog open={false} onClose={onClose} />);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: TITLE, hidden: true })).toBeNull(); });
    rerender(<HowToPlayDialog open onClose={onClose} />);
    expect(status()).toBe('How to play, 1 of 9'); // a reopened carousel starts on the first card
    await user.click(button('Got it'));
    expect(onClose.mock.calls).toEqual([['skip'], ['got-it']]);
  });
});
