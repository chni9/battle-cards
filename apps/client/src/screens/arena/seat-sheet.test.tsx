// @vitest-environment happy-dom
/**
 * Seat sheet: technical spec v7 §6.3, §6.5 (tap a seat: kit if visible, statuses, pending effects,
 * Spy hand), §6.6.5 (long-press), §11 (Q46); Appendix A `opponent-reveal-dialog`, `opponent-seat`,
 * `kit-inspect-dialog` (L74-05).
 */
import { getKit, type PlayingStateView, type PublicPlayerView } from '@card-battle/shared';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { RESOURCE_CAPTIONS } from '../../ui/resource-captions';
import { inPlayThumbs } from '../../view-model/card-actions';
import type { LayoutBox } from '../../view-model/seat-layout';
import { seats, type SeatModel } from '../../view-model/seats';
import { makePending, makePersistent, makePlayer } from '../../view-model/test-fixtures';
import { threats } from '../../view-model/threats';
import { ArenaScreen } from './arena-screen';
import type { CardSheetSource } from './card-sheet-source';
import { SeatSheet } from './seat-sheet';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const BOX: LayoutBox = { viewport: { width: 390, height: 844 }, arena: { width: 390, height: 360 } };

function seatOf(view: PlayingStateView, playerId: string): SeatModel {
  const seat = seats(view, BOX).seats.find((entry) => entry.playerId === playerId);
  if (seat === undefined) throw new Error(`no seat ${playerId}`);
  return seat;
}

function renderSheet(view: PlayingStateView, playerId = 'p1', options: { advanceTimers?: (ms: number) => unknown } = {}) {
  const onClose = vi.fn<() => void>();
  const onOpenKit = vi.fn<(kitId: string) => void>();
  const onOpenCard = vi.fn<(source: CardSheetSource) => void>();
  const seat = seatOf(view, playerId);
  const result = renderUi(
    <SeatSheet open seat={seat} view={view} threatModel={threats(view, null)} onClose={onClose} onOpenKit={onOpenKit} onOpenCard={onOpenCard} />,
    options.advanceTimers === undefined ? {} : { advanceTimers: options.advanceTimers },
  );
  return { ...result, seat, onClose, onOpenKit, onOpenCard };
}

function section(name: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-seat-sheet-section="${name}"]`);
  if (el === null) throw new Error(`no ${name} section`);
  return el;
}

function replacePlayer(view: PlayingStateView, player: PublicPlayerView): PlayingStateView {
  return { ...view, players: view.players.map((entry) => (entry.id === player.id ? player : entry)) };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SeatSheet (§6.3, §6.5)', () => {
  it('base Spy: shows the numbers, and no kit control and no hand', () => {
    const { seat } = renderSheet(makeArenaView({ tiers: { p1: 'base-spy' } }));
    const dialog = screen.getByRole('dialog', { name: 'p1' });
    expect(dialog.getAttribute('data-arena-sheet')).toBe('seat:p1');
    for (const resource of seat.resources) {
      expect(typeof resource.value).toBe('number');
      expect(within(section('resources')).getByText(`${RESOURCE_CAPTIONS[resource.kind]} ${String(resource.value)}`)).toBeDefined();
    }
    expect(dialog.querySelector('[data-zone="kit-portrait"]')).toBeNull();
    expect(within(dialog).queryByRole('heading', { name: 'Hand' })).toBeNull();
  });

  it('unspied: no kit control, and every value reads unknown', () => {
    renderSheet(makeArenaView());
    const dialog = screen.getByRole('dialog', { name: 'p1' });
    expect(dialog.querySelector('[data-zone="kit-portrait"]')).toBeNull();
    for (const label of ['Lives unknown', 'Points unknown', 'Upgrade points unknown', 'Shield unknown']) {
      expect(within(dialog).getByText(label)).toBeDefined();
    }
  });

  it('Spy+: the kit opens the kit sheet, and the hand thumbs open the card sheet as a Spy reveal', async () => {
    const view = makeArenaView({ tiers: { p1: 'spy-plus' } });
    const { user, seat, onOpenKit, onOpenCard } = renderSheet(view);
    await user.click(screen.getByRole('button', { name: getKit('tactician').name }));
    expect(onOpenKit).toHaveBeenCalledWith('tactician');
    const thumbs = within(section('hand')).getAllByRole('button');
    expect(thumbs).toHaveLength(seat.reveal?.hand.length ?? -1);
    const [first] = thumbs;
    if (first === undefined) throw new Error('no hand thumb');
    await user.click(first);
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'spy-reveal', instance: seat.reveal?.hand[0], ownerPlayerId: 'p1' });
    expect(document.querySelector('[data-seat-sheet-section="specials"]')).toBeNull();
  });

  it('a long-press on a hand thumb opens the same read-only card sheet (§6.6.5)', () => {
    vi.useFakeTimers();
    const { seat, onOpenCard } = renderSheet(makeArenaView({ tiers: { p1: 'spy-plus' } }), 'p1', { advanceTimers: vi.advanceTimersByTime });
    const [first] = within(section('hand')).getAllByRole('button');
    if (first === undefined) throw new Error('no hand thumb');
    // The press `use-long-press.test.tsx` (L74-02) fires: a primary button, held still.
    fireEvent.pointerDown(first, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'spy-reveal', instance: seat.reveal?.hand[0], ownerPlayerId: 'p1' });
  });

  it('an eliminated seat is titled "{nick} (eliminated)" with frozen values and its kit', async () => {
    const { user, seat, onOpenKit } = renderSheet(makeArenaView({ tiers: { p1: 'eliminated' } }));
    const dialog = screen.getByRole('dialog', { name: 'p1 (eliminated)' });
    expect(dialog.querySelector('[data-zone="kit-portrait"]')?.getAttribute('data-eliminated')).toBe('true');
    for (const resource of seat.resources) {
      expect(within(section('resources')).getByText(`${RESOURCE_CAPTIONS[resource.kind]} ${String(resource.value)}`)).toBeDefined();
    }
    await user.click(within(dialog).getByRole('button', { name: /, eliminated$/ }));
    expect(onOpenKit).toHaveBeenCalledTimes(1);
    expect(within(section('hand')).getByText('Empty')).toBeDefined();
  });

  it('lists every status badge, past the two the seat shows', () => {
    const p1 = makePlayer('p1', {
      spyingOnYou: true,
      blockTurnsRemaining: 2,
      activeShield: { isUpgraded: false },
      activePersistentEffects: [makePersistent({ id: 'poi', cardId: 'poison', counter: 3 })],
    });
    renderSheet(replacePlayer(makeArenaView(), p1));
    const statuses = section('statuses');
    for (const label of ['Spying on you', 'Block · 2 left', 'Shield', 'Poison, 3 card lives']) {
      expect(within(statuses).getByText(label)).toBeDefined();
    }
  });

  it('shows the bot label and the connection state in full', () => {
    let view = makeArenaView({ seatCount: 4 });
    view = replacePlayer(view, makePlayer('p1', { isBot: true, botDifficulty: 'hard' }));
    view = replacePlayer(view, makePlayer('p2', { connection: { status: 'absent', disconnectedAt: 0, automaticTurnsTaken: 2, consecutiveTimeouts: 0 } }));
    renderSheet(view, 'p1');
    expect(section('identity').textContent).toContain('Bot·Hard');
    renderSheet(view, 'p2');
    expect(screen.getByRole('dialog', { name: 'p2' }).textContent).toContain('absent 2/3');
  });

  it('lists its public pending effects in and out once each; each opens the queue inspect', async () => {
    const view = makeArenaView({
      seatCount: 3,
      overrides: {
        pendingEffects: [
          makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 3 }),
          makePending({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'spy', queuedAt: 4 }),
          makePending({ id: 'e3', sourcePlayerId: 'p1', targetPlayerId: 'p1', cardId: 'suicide', queuedAt: 5 }),
        ],
      },
    });
    const { user, onOpenCard } = renderSheet(view);
    const names = within(section('pending')).getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Inspect Spy', 'Inspect Suicide', 'Inspect Strong attack']);
    await user.click(within(section('pending')).getByRole('button', { name: 'Inspect Strong attack' }));
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'queue', effectId: 'e1', cardId: 'strong-attack', isUpgraded: false });
  });

  it('active thumbs and Sentence chips open the in-play card sheet; Sentence turns are a line, not a card counter', async () => {
    const base = makeArenaView({ overrides: { pendingSentences: [{ id: 's1', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false }] } });
    const view = replacePlayer(base, makePlayer('p1', {
      activeShield: { isUpgraded: false },
      activePersistentEffects: [makePersistent({ id: 'poi', cardId: 'poison', counter: 3 })],
    }));
    const { user, onOpenCard } = renderSheet(view);
    const inPlay = section('in-play');
    expect(within(inPlay).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Shield', 'Poison, 3 card lives', 'Sentence']);
    expect(inPlay.querySelectorAll('[data-card-counter]')).toHaveLength(1);
    expect(within(inPlay).getByText('2 turns remaining')).toBeDefined();
    await user.click(within(inPlay).getByRole('button', { name: 'Poison, 3 card lives' }));
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'in-play', thumb: inPlayThumbs(view, 'p1')[1] });
  });
});

describe('the seat sheet in the arena (§6.5, §6.6.4)', () => {
  it('a seat tap opens its sheet and marks the seat; Esc closes it; nothing is sent', async () => {
    const props = makeArenaProps({ view: makeArenaView({ tiers: { p1: 'base-spy' } }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    const seat = document.querySelector<HTMLElement>('[data-zone="opponent-seat"][data-player-id="p1"]');
    if (seat === null) throw new Error('no p1 seat');
    await user.click(within(seat).getByRole('button', { name: 'p1' }));
    expect(screen.getByRole('dialog', { name: 'p1' }).getAttribute('data-arena-sheet')).toBe('seat:p1');
    expect(seat.getAttribute('data-tapped-seat')).toBe('true');
    expectNoArenaIntent(props);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'p1' })).toBeNull();
    });
    expect(seat.hasAttribute('data-tapped-seat')).toBe(false);
    expectNoArenaIntent(props);
  });

  it('a Spy+ hand thumb opens the read-only card sheet above the seat sheet; nothing is sent', async () => {
    const props = makeArenaProps({ view: makeArenaView({ tiers: { p1: 'spy-plus' } }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    const seat = document.querySelector<HTMLElement>('[data-zone="opponent-seat"][data-player-id="p1"]');
    if (seat === null) throw new Error('no p1 seat');
    await user.click(within(seat).getByRole('button', { name: 'p1' }));
    const [thumb] = within(section('hand')).getAllByRole('button');
    if (thumb === undefined) throw new Error('no hand thumb');
    await user.click(thumb);
    expect(document.querySelector('[data-arena-sheet^="card:"]')).not.toBeNull();
    expect(document.querySelector('[data-arena-sheet="seat:p1"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('a Spy+ seat kit opens the kit sheet above the seat sheet; nothing is sent', async () => {
    const props = makeArenaProps({ view: makeArenaView({ tiers: { p1: 'spy-plus' } }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    const seat = document.querySelector<HTMLElement>('[data-zone="opponent-seat"][data-player-id="p1"]');
    if (seat === null) throw new Error('no p1 seat');
    await user.click(within(seat).getByRole('button', { name: 'p1' }));
    await user.click(within(screen.getByRole('dialog', { name: 'p1' })).getByRole('button', { name: getKit('tactician').name }));
    expect(screen.getByRole('dialog', { name: getKit('tactician').name }).getAttribute('data-arena-sheet')).toBe('kit:tactician');
    expect(document.querySelector('[data-arena-sheet="seat:p1"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });
});
