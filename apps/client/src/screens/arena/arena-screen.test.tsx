// @vitest-environment happy-dom
/**
 * The arena shell — technical spec v7 §4.4, §6.1, §6.4; Appendix A Q60 (every region always
 * renders); L74-01. It replaces the L72-20 pass-through test `arena-screen.test.ts`
 * (decisions.md 2026-10-28).
 */
import type { SubChoiceRequiredPayload } from '@card-battle/shared';
import { within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { ARENA_REGIONS } from './arena-regions';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };

function arenaRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('[data-arena="next"]');
  if (root === null) {
    throw new Error('no arena root');
  }
  return root;
}

function region(container: HTMLElement, name: string): HTMLElement {
  const found = container.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (found === null) {
    throw new Error(`no ${name} region`);
  }
  return found;
}

const has = (root: HTMLElement, selector: string): boolean => root.querySelector(selector) !== null;

describe('ArenaScreen shell (spec v7 §6.1, L74-01)', () => {
  it.each([2, 8])('renders the six regions top to bottom with their anchors for a %i-seat view', (seatCount) => {
    const props = makeArenaProps({ view: makeArenaView({ seatCount }) });
    const { container } = renderUi(<ArenaScreen {...props} />);
    const root = arenaRoot(container);
    expect(root.getAttribute('data-zone')).toBe('table');
    expect(Array.from(root.querySelectorAll('[data-arena-region]'), (node) => node.getAttribute('data-arena-region')))
      .toEqual([...ARENA_REGIONS]);
    expect(has(region(container, 'top-bar'), '[data-zone="timers"][data-hint-anchor="your-turn"]')).toBe(true);
    expect(has(region(container, 'ticker'), '[data-zone="log-collapsed"]')).toBe(true);
    const arena = region(container, 'arena');
    expect([
      arena.getAttribute('data-zone'),
      has(arena, '[data-zone="opponents"]'),
      has(arena, '[data-zone="pending"][data-hint-anchor="incoming"]'),
    ]).toEqual(['felt', true, true]);
    const self = region(container, 'self-strip');
    expect([self.getAttribute('data-zone'), self.getAttribute('data-player-id')]).toEqual(['private-zone', 'me']);
    expect(has(self, '[data-zone="resources"][data-hint-anchor="resources"]')).toBe(true);
    const hand = region(container, 'hand');
    expect([
      hand.getAttribute('data-zone'),
      has(hand, '[data-zone="hand"][data-hint-anchor="hand"]'),
      has(hand, '[data-zone="specials"][data-hint-anchor="specials"]'),
    ]).toEqual(['card-band', true, true]);
    expect(region(container, 'dock').getAttribute('data-zone')).toBe('dock');
    expect(container.querySelector('[data-card-row]')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('shows the empty states: an empty hand and no specials, in V2 words (Q60)', () => {
    const { container } = renderUi(<ArenaScreen {...makeArenaProps()} />);
    const band = region(container, 'hand');
    const hand = band.querySelector<HTMLElement>('[data-zone="hand"][data-hint-anchor="hand"]');
    const specials = band.querySelector<HTMLElement>('[data-zone="specials"][data-hint-anchor="specials"]');
    if (hand === null || specials === null) {
      throw new Error('missing hand or specials zone');
    }
    expect(within(hand).getByText('Hand')).toBeTruthy();
    expect(within(hand).getByText('Empty')).toBeTruthy();
    expect(within(specials).getByText('Specials')).toBeTruthy();
    expect(within(specials).getByText('None')).toBeTruthy();
  });

  it('keeps every region for a walk-in, its private zone keyed to the watcher (A.3)', () => {
    const { container } = renderUi(<ArenaScreen {...makeArenaProps({ view: makeArenaView({ pov: 'walk-in' }) })} />);
    expect(container.querySelectorAll('[data-arena-region]')).toHaveLength(ARENA_REGIONS.length);
    expect(region(container, 'self-strip').getAttribute('data-player-id')).toBe('watcher');
  });

  it('fills #root on the V7 ground with no viewport unit and no page scroll (L53-07, §6.4)', () => {
    const root = arenaRoot(renderUi(<ArenaScreen {...makeArenaProps()} />).container);
    for (const name of ['v7-ground', 'h-full', 'w-full', 'overflow-hidden']) {
      expect(root.classList.contains(name)).toBe(true);
    }
    expect(root.className).not.toMatch(/vh|w-screen|h-screen/);
  });

  it.each<{ label: string; overrides: Partial<ArenaScreenProps>; lock: string }>([
    { label: 'your turn', overrides: {}, lock: 'none' },
    { label: 'another seat’s turn', overrides: { view: makeArenaView({ overrides: { currentTurnPlayerId: 'p1' } }) }, lock: 'not-your-turn' },
    { label: 'the finished board', overrides: { readOnly: true }, lock: 'actions-locked' },
    { label: 'an open sub-choice', overrides: { subChoice: MIRROR_OPEN }, lock: 'actions-locked' },
    { label: 'an eliminated POV', overrides: { view: makeArenaView({ pov: 'eliminated', overrides: { currentTurnPlayerId: 'p1' } }) }, lock: 'actions-locked' },
    { label: 'a walk-in', overrides: { view: makeArenaView({ pov: 'walk-in' }) }, lock: 'actions-locked' },
  ])('computes one action lock for $label', ({ overrides, lock }) => {
    const { container } = renderUi(<ArenaScreen {...makeArenaProps(overrides)} />);
    expect(arenaRoot(container).getAttribute('data-action-lock')).toBe(lock);
  });

  it('renders one seat per opponent in the opponents zone; a seat tap sends nothing (L74-04)', async () => {
    const props = makeArenaProps({ view: makeArenaView({ seatCount: 8 }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    const zone = document.querySelector('[data-arena-region="arena"] [data-zone="opponents"]');
    if (zone === null) throw new Error('no opponents zone');
    expect(zone.querySelectorAll('[data-zone="opponent-seat"]')).toHaveLength(7);
    const seat = zone.querySelector<HTMLElement>('[data-player-id="p1"]');
    if (seat === null) throw new Error('no p1 seat');
    await user.click(within(seat).getByRole('button', { name: 'p1' }));
    expectNoArenaIntent(props);
  });
});
