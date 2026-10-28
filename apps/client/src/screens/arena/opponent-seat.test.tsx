// @vitest-environment happy-dom
/**
 * Opponent seats: technical spec v7 §6.2 (anatomy), §6.3 (one test per tier), §6.4 (arc and grid),
 * §11 (Q36, Q47, Q66); Appendix A `opponent-seat`; plan Review Focus 5 (L74-04).
 */
import { LOG_RESOURCE_KINDS, getKit, type PlayingStateView, type PublicPlayerView } from '@card-battle/shared';
import { within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import { SEAT_BOX, type LayoutBox } from '../../view-model/seat-layout';
import { seats, type SeatModel, type SeatsModel } from '../../view-model/seats';
import { makePersistent, makePlayer } from '../../view-model/test-fixtures';
import { ArenaSeats } from './arena-seats';
import { makeArenaView } from './test-view';

/** 3 opponents sit on the arc here; 7 opponents at 360 px fall back to the grid (L73 seat-layout tests). */
const ARC_BOX: LayoutBox = { viewport: { width: 390, height: 844 }, arena: { width: 390, height: 360 } };
const PHONE_360: LayoutBox = { viewport: { width: 360, height: 740 }, arena: { width: 360, height: 320 } };
/** 24 characters: the server's maximum (parity `home-nickname`). */
const LONG_NICK = 'Wolfeschlegelsteinhausen';

function renderSeats(view: PlayingStateView, box: LayoutBox = ARC_BOX) {
  const onOpenSeat = vi.fn<(playerId: string) => void>();
  const model = seats(view, box);
  const result = renderUi(<ArenaSeats model={model} arena={box.arena} tappedSeatId={null} onOpenSeat={onOpenSeat} />);
  return { ...result, model, onOpenSeat };
}

function seatEl(playerId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-zone="opponent-seat"][data-player-id="${playerId}"]`);
  if (el === null) throw new Error(`no seat ${playerId}`);
  return el;
}

function seatModelOf(model: SeatsModel, playerId: string): SeatModel {
  const seat = model.seats.find((entry) => entry.playerId === playerId);
  if (seat === undefined) throw new Error(`no model for ${playerId}`);
  return seat;
}

/** What a sighted player reads for each resource, in `LOG_RESOURCE_KINDS` order. */
function resourceTexts(seat: HTMLElement): string[] {
  return LOG_RESOURCE_KINDS.map((kind) => {
    const el = seat.querySelector(`[data-resource-kind="${kind}"]`);
    if (el === null) throw new Error(`no ${kind} value`);
    return visibleText(el);
  });
}

function replacePlayer(view: PlayingStateView, player: PublicPlayerView): PlayingStateView {
  return { ...view, players: view.players.map((entry) => (entry.id === player.id ? player : entry)) };
}

describe('opponent seat tiers (§6.3, one test per tier)', () => {
  it('unspied: lives and resources read ?, no kit shows, and the seat anchors the hidden-kit hint', () => {
    renderSeats(makeArenaView());
    const seat = seatEl('p1');
    expect(seat.getAttribute('data-tier')).toBe('unspied');
    expect(resourceTexts(seat)).toEqual(['?', '?', '?', '?']);
    expect(within(seat).getByText('Lives unknown')).toBeDefined();
    expect(seat.querySelector('[data-zone="kit-portrait"]')).toBeNull();
    expect(seat.getAttribute('data-hint-anchor')).toBe('hidden-kit');
  });

  it('never prints an unspied total: no digit in any value, title or spoken text of the seat', () => {
    renderSeats(makeArenaView());
    for (const el of seatEl('p1').querySelectorAll('[data-resource-kind]')) {
      expect(el.textContent).not.toMatch(/\d/);
      expect(el.getAttribute('title') ?? '').not.toMatch(/\d/);
    }
  });

  it('base Spy: live numbers show, but no kit and no hand; the kit still counts as hidden (Q66)', () => {
    const { model } = renderSeats(makeArenaView({ tiers: { p1: 'base-spy' } }));
    const seat = seatEl('p1');
    const values = seatModelOf(model, 'p1').resources.map((resource) => resource.value);
    expect(values.every((value) => typeof value === 'number')).toBe(true);
    expect(resourceTexts(seat)).toEqual(values.map(String));
    expect(seat.querySelector('[data-zone="kit-portrait"]')).toBeNull();
    expect(seat.querySelector('[data-card-face]')).toBeNull();
    expect(seat.getAttribute('data-hint-anchor')).toBe('hidden-kit');
  });

  it('Spy+: the kit portrait shows, named by the kit (§11), with numbers and no hand on the seat', () => {
    const { model } = renderSeats(makeArenaView({ tiers: { p1: 'spy-plus' } }));
    const seat = seatEl('p1');
    expect(within(seat).getByRole('img', { name: getKit('tactician').name })).toBeDefined();
    expect(seat.querySelector('[data-zone="opponent-portrait"] [data-zone="kit-portrait"]')).not.toBeNull();
    expect(resourceTexts(seat)).toEqual(seatModelOf(model, 'p1').resources.map((resource) => String(resource.value)));
    expect(seat.querySelector('[data-card-face]')).toBeNull();
    expect(seat.hasAttribute('data-hint-anchor')).toBe(false);
  });

  it('eliminated: frozen values, the greyscale portrait with its Eliminated cross, and no hint anchor', () => {
    const { model } = renderSeats(makeArenaView({ tiers: { p1: 'eliminated' } }));
    const seat = seatEl('p1');
    expect(seat.getAttribute('data-eliminated')).toBe('true');
    expect(seat.querySelector('[data-zone="kit-portrait"]')?.getAttribute('data-eliminated')).toBe('true');
    expect(within(seat).getByRole('img', { name: 'Eliminated' })).toBeDefined();
    expect(resourceTexts(seat)).toEqual(seatModelOf(model, 'p1').resources.map((resource) => String(resource.value)));
    expect(seat.hasAttribute('data-hint-anchor')).toBe(false);
    expect(seat.querySelector('[data-seat-bot], [data-seat-connection], [data-spy-eye]')).toBeNull();
  });

  it.each([
    { label: 'a walk-in who stayed', view: makeArenaView({ pov: 'walk-in', seatCount: 4, tiers: { me: 'spy-plus', p1: 'spy-plus', p2: 'spy-plus', p3: 'spy-plus' } }), ids: ['me', 'p1', 'p2', 'p3'] },
    { label: 'an eliminated POV', view: makeArenaView({ pov: 'eliminated', seatCount: 3, tiers: { p1: 'spy-plus', p2: 'spy-plus' } }), ids: ['p1', 'p2'] },
  ])('spectator overlay ($label): every seat shows its kit and numbers', ({ view, ids }) => {
    renderSeats(view);
    const drawn = Array.from(document.querySelectorAll('[data-zone="opponent-seat"]'), (el) => el.getAttribute('data-player-id'));
    expect(drawn).toHaveLength(ids.length);
    expect(drawn).toEqual(expect.arrayContaining(ids));
    for (const id of ids) {
      const seat = seatEl(id);
      expect(seat.querySelector('[data-zone="kit-portrait"]')?.getAttribute('data-kit-face')).toBe('art');
      expect(resourceTexts(seat)).not.toContain('?');
    }
  });
});

describe('opponent seat layout (§6.4)', () => {
  it('renders the grid in seat order when seats() returns grid mode (7 opponents at 360 px)', () => {
    const { model } = renderSeats(makeArenaView({ seatCount: 8 }), PHONE_360);
    expect(model.layout).toEqual({ kind: 'grid', mode: 'portrait', rows: [['p1', 'p2', 'p3', 'p4'], ['p5', 'p6', 'p7']] });
    expect(document.querySelector('[data-zone="opponents"]')?.getAttribute('data-seat-layout')).toBe('grid');
    const drawn = Array.from(document.querySelectorAll<HTMLElement>('[data-zone="opponent-seat"]'));
    expect(drawn.map((el) => el.getAttribute('data-player-id'))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    const tops = drawn.map((el) => el.style.top);
    expect(new Set(tops.slice(0, 4)).size).toBe(1);
    expect(new Set(tops.slice(4)).size).toBe(1);
    expect(parseFloat(tops[4] ?? '')).toBeGreaterThan(parseFloat(tops[0] ?? ''));
  });

  it('places each arc seat at its model placement, in drawing order', () => {
    const { model } = renderSeats(makeArenaView({ seatCount: 4 }));
    if (model.layout.kind !== 'arc') throw new Error('expected an arc');
    expect(document.querySelector('[data-zone="opponents"]')?.getAttribute('data-seat-layout')).toBe('arc');
    for (const placement of model.layout.placements) {
      const seat = seatEl(placement.playerId);
      // The CSS serializer rounds lengths (happy-dom to 6 decimals), so compare numbers, not strings.
      expect(seat.style.left).toMatch(/px$/);
      expect(parseFloat(seat.style.left)).toBeCloseTo(placement.centerX - SEAT_BOX.portrait.width / 2, 5);
      expect(seat.style.top).toMatch(/px$/);
      expect(parseFloat(seat.style.top)).toBeCloseTo(placement.centerY - SEAT_BOX.portrait.height / 2, 5);
    }
  });

  it('marks only the active seat with data-active-seat', () => {
    renderSeats(makeArenaView({ seatCount: 4, overrides: { currentTurnPlayerId: 'p2' } }));
    expect(seatEl('p2').getAttribute('data-active-seat')).toBe('true');
    expect(seatEl('p1').hasAttribute('data-active-seat')).toBe(false);
    expect(seatEl('p3').hasAttribute('data-active-seat')).toBe(false);
  });
});

describe('opponent seat anatomy (§6.2)', () => {
  it('a 24-character nickname is the full accessible name of the seat button, truncated on screen with a title (Review Focus 5)', () => {
    renderSeats(replacePlayer(makeArenaView({ seatCount: 8 }), makePlayer('p1', { nickname: LONG_NICK })), PHONE_360);
    const seat = seatEl('p1');
    expect(within(seat).getByRole('button', { name: LONG_NICK })).toBeDefined();
    const name = seat.querySelector('[data-seat-name]');
    expect(name?.getAttribute('title')).toBe(LONG_NICK);
    expect(name?.textContent).toContain(LONG_NICK);
  });

  it('shows two status badges then +n; the eye keeps data-spy-eye', () => {
    const p1 = makePlayer('p1', {
      spyingOnYou: true,
      blockTurnsRemaining: 2,
      activeShield: { isUpgraded: false },
      activePersistentEffects: [makePersistent({ id: 'poi', cardId: 'poison', counter: 3 })],
    });
    renderSeats(replacePlayer(makeArenaView(), p1));
    const seat = seatEl('p1');
    expect(Array.from(seat.querySelectorAll('[data-seat-badge]'), (el) => el.getAttribute('data-seat-badge'))).toEqual(['spying-on-you', 'block']);
    expect(seat.querySelector('[data-seat-badge="spying-on-you"]')?.hasAttribute('data-spy-eye')).toBe(true);
    const more = seat.querySelector('[data-seat-badge-overflow]');
    expect(more === null ? '' : visibleText(more)).toBe('+2');
    expect(more?.textContent).toBe('+2 more statuses');
  });

  it('shows a bot, a connection state, or neither, with the words for screen readers and as a title', () => {
    let view = makeArenaView({ seatCount: 4 });
    view = replacePlayer(view, makePlayer('p1', { isBot: true, botDifficulty: 'hard' }));
    view = replacePlayer(view, makePlayer('p2', { connection: { status: 'disconnected', disconnectedAt: 0, automaticTurnsTaken: 0, consecutiveTimeouts: 0 } }));
    renderSeats(view);
    expect(seatEl('p1').querySelector('[data-seat-bot]')?.textContent).toBe('Bot·Hard');
    expect(seatEl('p2').querySelector('[data-seat-connection]')?.getAttribute('title')).toBe('disconnected — grace');
    expect(seatEl('p2').querySelector('[data-seat-connection]')?.textContent).toBe('disconnected — grace');
    expect(seatEl('p3').querySelector('[data-seat-bot], [data-seat-connection]')).toBeNull();
  });

  it('shows a Gambler draw gain the POV receives (Q47)', () => {
    const base = makeArenaView({ tiers: { p1: 'base-spy' } });
    const spied = base.players.find((player) => player.id === 'p1')?.spied;
    if (spied === undefined) throw new Error('p1 is not spied');
    renderSeats(replacePlayer(base, makePlayer('p1', { spied, drawGain: 37 })));
    const badge = seatEl('p1').querySelector('[data-seat-badge="draw-gain"]');
    expect(badge === null ? '' : visibleText(badge)).toBe('+37');
    expect(badge?.getAttribute('title')).toBe('Draw, plus 37 pts');
  });

  it('a tap on the seat calls onOpenSeat once with its id', async () => {
    const { user, onOpenSeat } = renderSeats(makeArenaView());
    await user.click(within(seatEl('p1')).getByRole('button', { name: 'p1' }));
    expect(onOpenSeat).toHaveBeenCalledTimes(1);
    expect(onOpenSeat).toHaveBeenCalledWith('p1');
  });
});
