// @vitest-environment happy-dom
/**
 * Top bar — technical spec v7 §6.1 item 1, §6.12 (leave / forfeit confirm, finished board),
 * §5.6 (icon-only controls keep aria-labels); Lot 74 plan rulings 2 and 3; L43-05 (the first
 * flag tap never leaves; Esc / overlay = Stay), L43-06 (Forfeit keeps the socket), L57-01 (`!`,
 * not the word), L47-03 (finished-board Feedback belongs to Game over). Every test that opens
 * something asserts that no intent fired (§6.6.4).
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiResult } from '../../test/render';
import { HOW_TO_PLAY_SEEN_KEY } from '../../ui/help-storage';
import { v7SeatColor } from '../../ui/palette';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

function renderArena(overrides: Partial<ArenaScreenProps> = {}): RenderUiResult & { props: ArenaScreenProps } {
  const props = makeArenaProps(overrides);
  return { ...renderUi(<ArenaScreen {...props} />), props };
}

function topBar(container: HTMLElement): HTMLElement {
  const found = container.querySelector<HTMLElement>('[data-arena-region="top-bar"]');
  if (found === null) {
    throw new Error('no top bar');
  }
  return found;
}

function overlayOf(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) {
    throw new Error('no sheet overlay');
  }
  return overlay;
}

/** A hex as happy-dom reads it back (PlayerName test pattern). */
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('TopBar banner (spec v7 §6.1 item 1)', () => {
  it('shows the round and Your turn on the POV turn, with no Block line', () => {
    const { container } = renderArena({ view: makeArenaView({ overrides: { turnSequence: 7 } }) });
    const bar = topBar(container);
    expect(within(bar).getByText('Round 3')).toBeTruthy();
    const banner = within(bar).getByRole('heading', { level: 2 });
    expect([banner.textContent, banner.querySelector('[data-seat-index]')]).toEqual(['Your turn', null]);
    expect(within(bar).queryByText(/Block/)).toBeNull();
  });

  it("shows {Nick}'s turn with the nickname in its seat hue", () => {
    const { container } = renderArena({ view: makeArenaView({ overrides: { currentTurnPlayerId: 'p2' } }) });
    const banner = within(topBar(container)).getByRole('heading', { level: 2 });
    expect(banner.textContent).toBe("p2's turn");
    const nick = banner.querySelector<HTMLElement>('[data-seat-index]');
    expect([nick?.textContent, nick?.getAttribute('data-seat-index'), nick?.style.color]).toEqual(['p2', '2', cssColor(v7SeatColor(2))]);
  });

  it('shows — when no seat is active', () => {
    const { container } = renderArena({ view: makeArenaView({ overrides: { currentTurnPlayerId: null } }) });
    expect(within(topBar(container)).getByRole('heading', { level: 2 }).textContent).toBe('—');
  });

  it('shows — on the finished board, for the POV turn and for another seat (Gate C, S-C3)', () => {
    for (const currentTurnPlayerId of ['me', 'p2']) {
      const { container, unmount } = renderArena({ readOnly: true, view: makeArenaView({ overrides: { currentTurnPlayerId } }) });
      expect(within(topBar(container)).getByRole('heading', { level: 2 }).textContent).toBe('—');
      unmount();
    }
  });

  it.each([
    { label: 'a Block chain', patch: { blockTurnsRemaining: 2, blockAttacksForbidden: false }, text: 'Block chain · 2 turns left' },
    { label: 'an attack ban', patch: { blockTurnsRemaining: 0, blockAttacksForbidden: true }, text: 'Block · attacks banned this turn' },
  ])('shows the active seat’s Block line for $label', ({ patch, text }) => {
    const base = makeArenaView({ overrides: { currentTurnPlayerId: 'p1' } });
    const view = { ...base, players: base.players.map((player) => (player.id === 'p1' ? { ...player, ...patch } : player)) };
    const { container } = renderArena({ view });
    expect(within(topBar(container)).getByText(text)).toBeTruthy();
  });
});

describe('TopBar flag (spec v7 §6.12, L43-05, L43-06)', () => {
  it('opens the forfeit confirm on the first flag tap, with Stay focused, and sends nothing', async () => {
    const { container, user, props } = renderArena();
    await user.click(within(topBar(container)).getByRole('button', { name: 'Forfeit' }));
    const confirm = screen.getByRole('dialog', { name: 'Leave the game?' });
    expect(within(confirm).getByText('That counts as a forfeit.')).toBeTruthy();
    expect(document.activeElement).toBe(within(confirm).getByRole('button', { name: 'Stay' }));
    expectNoArenaIntent(props);
  });

  it.each(['Stay', 'Esc', 'the backdrop'] as const)('closes the confirm on %s and sends nothing', async (way) => {
    const { container, user, props } = renderArena();
    await user.click(within(topBar(container)).getByRole('button', { name: 'Forfeit' }));
    const confirm = screen.getByRole('dialog', { name: 'Leave the game?' });
    if (way === 'Stay') {
      await user.click(within(confirm).getByRole('button', { name: 'Stay' }));
    } else if (way === 'Esc') {
      await user.keyboard('{Escape}');
    } else {
      await user.click(overlayOf(confirm));
    }
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Leave the game?' })).toBeNull();
    });
    expectNoArenaIntent(props);
  });

  it('forfeits once on Forfeit, even on a double tap, and never leaves', async () => {
    const { container, user, props } = renderArena();
    await user.click(within(topBar(container)).getByRole('button', { name: 'Forfeit' }));
    const forfeit = within(screen.getByRole('dialog', { name: 'Leave the game?' })).getByRole('button', { name: 'Forfeit' });
    fireEvent.click(forfeit);
    fireEvent.click(forfeit);
    expect(props.onForfeit).toHaveBeenCalledTimes(1);
    expect(props.onLeave).not.toHaveBeenCalled();
  });

  it.each(['walk-in', 'eliminated'] as const)('gives a %s POV Leave table, which leaves without forfeiting', async (pov) => {
    const { container, user, props } = renderArena({ view: makeArenaView({ pov, overrides: { currentTurnPlayerId: 'p1' } }) });
    await user.click(within(topBar(container)).getByRole('button', { name: 'Leave table' }));
    const confirm = screen.getByRole('dialog', { name: 'Leave the table?' });
    expectNoArenaIntent(props);
    await user.click(within(confirm).getByRole('button', { name: 'Leave' }));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    expect(props.onForfeit).not.toHaveBeenCalled();
  });

  it('turns the finished-board flag into Return home, which leaves', async () => {
    const { container, user, props } = renderArena({ readOnly: true, onOpenFeedback: vi.fn(), onShowStats: vi.fn() });
    await user.click(within(topBar(container)).getByRole('button', { name: 'Return home' }));
    const confirm = screen.getByRole('dialog', { name: 'Return home?' });
    expect(within(confirm).getByText('Leave this finished game and go back to the home screen.')).toBeTruthy();
    await user.click(within(confirm).getByRole('button', { name: 'Return home' }));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    expect(props.onForfeit).not.toHaveBeenCalled();
  });

  it('follows the live flag intent: an open Forfeit confirm becomes Leave the table when the POV is eliminated (decisions 2026-10-28)', async () => {
    const { container, user, props, rerender } = renderArena();
    await user.click(within(topBar(container)).getByRole('button', { name: 'Forfeit' }));
    expect(screen.getByRole('dialog', { name: 'Leave the game?' })).toBeTruthy();
    rerender(<ArenaScreen {...props} view={makeArenaView({ pov: 'eliminated', overrides: { currentTurnPlayerId: 'p1' } })} />);
    await user.click(within(screen.getByRole('dialog', { name: 'Leave the table?' })).getByRole('button', { name: 'Leave' }));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    expect(props.onForfeit).not.toHaveBeenCalled();
  });

  it('re-arms the confirm on each open: flag, Forfeit, flag, Forfeit forfeits twice', async () => {
    const { container, user, props } = renderArena();
    const forfeitOnce = async (): Promise<void> => {
      await user.click(within(topBar(container)).getByRole('button', { name: 'Forfeit' }));
      await user.click(within(screen.getByRole('dialog', { name: 'Leave the game?' })).getByRole('button', { name: 'Forfeit' }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Leave the game?' })).toBeNull();
      });
    };
    await forfeitOnce();
    await forfeitOnce();
    expect(props.onForfeit).toHaveBeenCalledTimes(2);
    expect(props.onLeave).not.toHaveBeenCalled();
  });
});

describe('TopBar Feedback and menu (spec v7 §6.1, §6.12)', () => {
  it('names the Feedback control Feedback with no visible word, and opens the live Feedback dialog', async () => {
    const { container, user, props } = renderArena();
    const feedback = within(topBar(container)).getByRole('button', { name: 'Feedback' });
    expect(feedback.textContent).toBe('');
    await user.click(feedback);
    expect(screen.getByRole('dialog', { name: 'Feedback' })).toBeTruthy();
    expectNoArenaIntent(props);
  });

  it('hands Feedback to the finished-board parent and opens no dialog of its own', async () => {
    const onOpenFeedback = vi.fn();
    const { container, user, props } = renderArena({ readOnly: true, onOpenFeedback });
    await user.click(within(topBar(container)).getByRole('button', { name: 'Feedback' }));
    expect(onOpenFeedback).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    expectNoArenaIntent(props);
  });

  it.each([
    { way: 'Skip', seen: '1' },
    { way: 'Got it', seen: '1' },
    { way: 'Esc', seen: null },
  ] as const)('marks How to play seen from the menu: $way → $seen', async ({ way, seen }) => {
    const { container, user, props } = renderArena();
    await user.click(within(topBar(container)).getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', { name: 'How to play' }));
    const howTo = screen.getByRole('dialog', { name: 'How to play' });
    if (way === 'Esc') {
      await user.keyboard('{Escape}');
    } else {
      await user.click(within(howTo).getByRole('button', { name: way }));
    }
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();
    });
    expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe(seen);
    expectNoArenaIntent(props);
  });

  it('shows the game code with the connection label and copies the code', async () => {
    const { container, user, props } = renderArena();
    await user.click(within(topBar(container)).getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(menu.getAttribute('data-arena-sheet')).toBe('menu');
    expect(within(menu).getByText('Code TEST · Connected')).toBeTruthy();
    await user.click(within(menu).getByRole('button', { name: 'Copy' }));
    expect(await within(menu).findByText('Code copied')).toBeTruthy();
    expect(await navigator.clipboard.readText()).toBe('TEST');
    expectNoArenaIntent(props);
  });

  it('reports a failed copy', async () => {
    const { container, user } = renderArena();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(within(topBar(container)).getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('Copy failed')).toBeTruthy();
  });
});
