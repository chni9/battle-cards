// @vitest-environment happy-dom
/**
 * Log ticker and log sheet: technical spec v7 §6.1, §6.9; L56-05, L63-06; Appendix A
 * `table-action-log-panel`, `table-action-log-collapsed-dialog`, `table-action-log-entry-copy`,
 * `table-action-log-post-lot61-lines`, `table-action-log-resource-nets`, `table-action-log-inspect`
 * (L74-15). Also the behavior replacements the Owner lot 75 `action-log-panel.test.ts` rows name.
 */
import type { ActionLogEntryView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi, type RenderUiResult } from '../../test/render';
import { ArenaScreen } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const drawBy = (actorPlayerId: string, turnSequence: number): ActionLogEntryView => ({ kind: 'actionPlayed', actorPlayerId, action: 'draw', turnSequence });
const GHOST_DRAW: ActionLogEntryView = {
  kind: 'actionPlayed', actorPlayerId: 'p1', action: 'draw', turnSequence: 1,
  resourceDeltas: [{ kind: 'point', concealed: true, direction: 'gain' }],
};
const ATTACK: ActionLogEntryView = {
  kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'basic-attack', isUpgraded: false, targetPlayerId: 'me', turnSequence: 3,
};
const ELIMINATED: ActionLogEntryView = { kind: 'playerEliminated', playerId: 'p2', eliminatorPlayerId: 'p1', reason: 'combat', turnSequence: 4 };
/** Three seats: turns 0–2 are round 1, 3–5 round 2. Log indexes 0–4. */
const LOG = [drawBy('me', 0), GHOST_DRAW, drawBy('p2', 2), ATTACK, ELIMINATED];

function setup(actionLog: readonly ActionLogEntryView[]) {
  const props = makeArenaProps({ view: makeArenaView({ overrides: { actionLog } }) });
  return { props, ...renderUi(<ArenaScreen {...props} />) };
}
function part(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const region = (name: string): HTMLElement => part(document, `[data-arena-region="${name}"]`);
const lineAt = (sheet: HTMLElement, index: number): HTMLElement => part(sheet, `[data-log-line="${String(index)}"]`);
async function openLog(user: RenderUiResult['user']): Promise<HTMLElement> {
  await user.click(within(region('ticker')).getByRole('button'));
  return screen.getByRole('dialog', { name: 'Action log' });
}

describe('Log ticker and sheet (§6.9)', () => {
  it('the ticker is one button showing the newest line, and a tap opens the log sheet', async () => {
    const { user, props } = setup([drawBy('me', 0), drawBy('p1', 1)]);
    const ticker = within(region('ticker')).getByRole('button', { name: 'Action log: p1 draws' });
    expect([ticker.getAttribute('data-zone'), ticker.getAttribute('title'), visibleText(ticker)]).toEqual(['log-collapsed', 'Action log: p1 draws', 'p1 draws']);
    await user.click(ticker);
    const sheet = screen.getByRole('dialog', { name: 'Action log' });
    expect(sheet.getAttribute('data-arena-sheet')).toBe('log');
    expect(sheet.querySelector('[data-zone="action-log-panel"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('reads "No actions yet" in the ticker and in the sheet while the log is empty', async () => {
    const { user } = setup([]);
    const ticker = within(region('ticker')).getByRole('button', { name: 'Action log: No actions yet' });
    expect(visibleText(ticker)).toBe('No actions yet');
    await user.click(ticker);
    expect(within(screen.getByRole('dialog', { name: 'Action log' })).getByText('No actions yet')).toBeTruthy();
  });

  it('groups lines by round under sticky headers, with seat-hued nicknames and icon nets (+? concealed)', async () => {
    const { user } = setup(LOG);
    const sheet = await openLog(user);
    const rounds = [...sheet.querySelectorAll<HTMLElement>('[data-log-round]')];
    expect(rounds.map((round) => [part(round, 'h3').textContent, round.querySelectorAll('[data-log-line]').length]))
      .toEqual([['Round 1', 3], ['Round 2', 2]]);
    expect(rounds.every((round) => part(round, 'h3').classList.contains('sticky'))).toBe(true);
    const ghost = lineAt(sheet, 1);
    expect(part(ghost, '[data-seat-index]').textContent).toBe('p1');
    const net = part(ghost, '[data-log-net="point"]');
    expect([visibleText(net), spokenTexts(net)]).toEqual(['+?', ['concealed points gain']]);
  });

  it('a card name opens the read-only card sheet with no footer; draw and elimination lines are not buttons', async () => {
    const { user, props } = setup(LOG);
    const sheet = await openLog(user);
    expect([within(lineAt(sheet, 0)).queryAllByRole('button'), within(lineAt(sheet, 4)).queryAllByRole('button')]).toEqual([[], []]);
    await user.click(within(lineAt(sheet, 3)).getByRole('button', { name: 'Basic attack' }));
    const card = screen.getByRole('dialog', { name: 'Basic attack' });
    expect(card.getAttribute('data-arena-sheet')).toBe('card:log-basic-attack-base');
    expect(card.querySelector('[data-zone="sheet-actions"]')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('an unspied pool buy reads "bought a card from the pool" and names no card (L63-06)', async () => {
    const { user } = setup([{ kind: 'actionPlayed', actorPlayerId: 'p2', action: 'buyPoolCard', turnSequence: 2 }]);
    expect(within(region('ticker')).getByRole('button', { name: 'Action log: p2 bought a card from the pool' })).toBeTruthy();
    const line = lineAt(await openLog(user), 0);
    expect([line.textContent, within(line).queryAllByRole('button')]).toEqual(['p2 bought a card from the pool', []]);
  });

  it('renders no filter, search, export or Why control, even for a bot line with a reason (L45-05)', async () => {
    const { user } = setup([{ kind: 'actionPlayed', actorPlayerId: 'p1', action: 'draw', turnSequence: 1, botReason: { code: 'pressure' } }]);
    const sheet = await openLog(user);
    expect(within(sheet).queryAllByRole('button')).toEqual([]);
    for (const role of ['textbox', 'searchbox', 'combobox'] as const) {
      expect(within(sheet).queryAllByRole(role)).toEqual([]);
    }
    expect(within(sheet).queryByText(/why/i)).toBeNull();
  });

  it('Menu → Action log opens the same sheet, after How to play (§6.1)', async () => {
    const { user, props } = setup([drawBy('me', 0)]);
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(menu).getAllByRole('button').map((button) => button.textContent)).toEqual(['How to play', 'Action log', 'Copy']);
    await user.click(within(menu).getByRole('button', { name: 'Action log' }));
    expect(screen.getByRole('dialog', { name: 'Action log' }).getAttribute('data-arena-sheet')).toBe('log');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
    expectNoArenaIntent(props);
  });
});
