// @vitest-environment happy-dom
/**
 * The desktop log panel: technical spec v7 §6.4, §6.9; Appendix A `table-action-log-panel`; plan
 * Appendix A.4.1 (L75-02). Also the follow rule's call-site test the L74-26 review left open (M3):
 * every stick refreshes `lastTop`, so a scroll event the reader did not make never unsticks the log.
 */
import type { ActionLogEntryView } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { log } from '../../view-model/log';
import { LogPanel } from './log-panel';
import { ARENA_TEST_BOXES, makeArenaView, stubArenaLayout, type ArenaLayoutStub } from './test-view';

const drawBy = (actorPlayerId: string, turnSequence: number): ActionLogEntryView => ({ kind: 'actionPlayed', actorPlayerId, action: 'draw', turnSequence });
const ATTACK: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'basic-attack', isUpgraded: false, targetPlayerId: 'me', turnSequence: 3 };
/** Three seats: turns 0–2 are round 1, turn 3 round 2. */
const LOG = [drawBy('me', 0), drawBy('p1', 1), drawBy('p2', 2), ATTACK];

let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });

function setup(expanded: boolean, actionLog: readonly ActionLogEntryView[] = LOG) {
  const view = makeArenaView({ overrides: { actionLog } });
  const onToggle = vi.fn<() => void>();
  const onOpenCard = vi.fn();
  return { onToggle, onOpenCard, ...renderUi(<LogPanel expanded={expanded} view={view} model={log(view)} onToggle={onToggle} onOpenCard={onOpenCard} />) };
}
const toggle = (): HTMLElement => screen.getByRole('button', { name: 'Action log' });
const port = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-zone="action-log-panel"]');

/** happy-dom has no layout: give the scrollport a geometry and clamp writes as a browser does. */
function stubScroller(element: HTMLElement, box: { scrollHeight: number; clientHeight: number; scrollTop: number }): void {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, get: () => box.scrollHeight },
    clientHeight: { configurable: true, get: () => box.clientHeight },
    scrollTop: {
      configurable: true,
      get: () => box.scrollTop,
      set: (value: number) => { box.scrollTop = Math.min(value, box.scrollHeight - box.clientHeight); },
    },
  });
}

describe('LogPanel (§6.4, §6.9)', () => {
  it('expanded: a 44 px toggle that controls a scrollport of rounds under sticky top-0 headers', () => {
    setup(true);
    expect([toggle().getAttribute('data-zone'), toggle().getAttribute('aria-expanded'), toggle().getAttribute('aria-controls')])
      .toEqual(['log-collapsed', 'true', port()?.id]);
    const rounds = [...(port()?.querySelectorAll<HTMLElement>('[data-log-round]') ?? [])];
    expect(rounds.map((round) => [round.querySelector('h3')?.textContent, round.querySelectorAll('[data-log-line]').length]))
      .toEqual([['Round 1', 3], ['Round 2', 1]]);
    const header = rounds[0]?.querySelector('h3');
    expect([header?.classList.contains('top-0'), header?.classList.contains('-top-3')]).toEqual([true, false]);
  });

  it('expanded: the scrollport positions its lines\' sr-only text, so <main> gains no scrollable overflow (Check 1)', () => {
    setup(true);
    // An `sr-only` span is absolutely positioned: its containing block is the nearest positioned
    // ancestor. A static scrollport hands it to <main> (overflow-hidden, yet programmatically
    // scrollable), whose scrollHeight then grew by the whole log. happy-dom computes no layout, so
    // this pins the scrollport's own `relative` against the lines that need it.
    expect(port()?.querySelector('.sr-only')).not.toBeNull();
    expect(port()?.classList.contains('relative')).toBe(true);
  });

  it('collapsed: only the toggle renders, so no zero-size list is left for the FX (Review Focus 5)', () => {
    setup(false);
    expect([toggle().getAttribute('aria-expanded'), port(), document.querySelector('[data-log-round]')]).toEqual(['false', null, null]);
  });

  it('the toggle calls onToggle and a card name opens its read-only sheet', async () => {
    const { user, onToggle, onOpenCard } = setup(true);
    await user.click(toggle());
    expect(onToggle).toHaveBeenCalledTimes(1);
    await user.click(within(port() ?? document.body).getByRole('button', { name: 'Basic attack' }));
    expect(onOpenCard.mock.calls).toEqual([[{ kind: 'log', cardId: 'basic-attack', isUpgraded: false }]]);
  });

  it('reads "No actions yet" while the log is empty', () => {
    setup(true, []);
    expect(within(port() ?? document.body).getByText('No actions yet')).toBeTruthy();
  });

  it('keeps following new lines through a scroll event the reader did not make (L74-26 review M3)', () => {
    layout = stubArenaLayout(ARENA_TEST_BOXES.desktop.viewport, ARENA_TEST_BOXES.desktop.arena);
    setup(true);
    const scroller = port();
    if (scroller === null) throw new Error('no scrollport');
    const box = { scrollHeight: 900, clientHeight: 300, scrollTop: 0 };
    stubScroller(scroller, box);
    const grow = (): void => { layout?.setArena(1000, 600); }; // fires every fake ResizeObserver: the follow re-sticks
    grow();
    expect(box.scrollTop).toBe(600);
    box.scrollHeight = 1100; // new lines landed; Chrome fires a scroll with scrollTop unchanged
    fireEvent.scroll(scroller);
    grow();
    expect(box.scrollTop).toBe(800);
    box.scrollTop = 300; // the reader scrolls up
    fireEvent.scroll(scroller);
    box.scrollHeight = 1300;
    grow();
    expect(box.scrollTop).toBe(300);
  });
});
