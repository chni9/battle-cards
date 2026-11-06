// @vitest-environment happy-dom
/**
 * Table rules recall: technical spec v7 §6.11, §7.4, §11 (Q15: excluded in words); Appendix A
 * `rules-recall-table-end` (L74-22). The live source is App's cached lobby rules; the finished
 * board's is `FinishedStateView.lobbyRules`, which EndScreen passes as `view.lobbyRules ?? null`
 * (L74-21's mount split). The arena shapes either with `tableRulesRecall` (Classic only).
 */
import type { LobbyRules } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiResult } from '../../test/render';
import { makeFinishedView } from '../../view-model/test-fixtures';
import { EndScreen } from '../end';
import { STATUS_LABELS } from '../status-labels';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const RULES: LobbyRules = { excludedKitIds: ['kamikaze', 'gambler'], randomOnly: true, turnTimeSeconds: 45 };

function renderArena(overrides: Partial<ArenaScreenProps>) {
  const props = makeArenaProps(overrides);
  return { props, ...renderUi(<ArenaScreen {...props} />) };
}
async function openMenu(user: RenderUiResult['user']): Promise<HTMLElement> {
  const bar = document.querySelector<HTMLElement>('[data-arena-region="top-bar"]');
  if (bar === null) throw new Error('no top bar');
  await user.click(within(bar).getByRole('button', { name: 'Menu' }));
  return screen.getByRole('dialog', { name: 'Menu' });
}

describe('Table rules recall (§6.11)', () => {
  it('lists Table rules after Action log and opens the read-only rules sheet, excluded kits named in words', async () => {
    const { user, props } = renderArena({ cachedLobbyRules: RULES });
    const menu = await openMenu(user);
    expect(within(menu).getAllByRole('button').map((button) => button.textContent)).toEqual(['How to play', 'Action log', 'Table rules', 'Copy']);
    await user.click(within(menu).getByRole('button', { name: 'Table rules' }));
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(sheet.getAttribute('data-arena-sheet')).toBe('rules');
    expect(within(sheet).getByText('45s')).toBeTruthy();
    expect(within(sheet).getByText('Random')).toBeTruthy();
    const faces = [...sheet.querySelectorAll<HTMLElement>('[data-kit-id]')];
    const excluded = faces.filter((face) => face.getAttribute('data-excluded') === 'true');
    expect(excluded.map((face) => [face.getAttribute('data-kit-id'), face.textContent.includes('Excluded')])).toEqual([['kamikaze', true], ['gambler', true]]);
    expect(faces.filter((face) => !excluded.includes(face)).some((face) => face.textContent.includes('Excluded'))).toBe(false);
    expectNoArenaIntent(props);
  });

  it('hides the entry while the rules are unknown (a reload, a walk-in mid-game)', async () => {
    const { user } = renderArena({ cachedLobbyRules: null });
    const menu = await openMenu(user);
    expect(within(menu).queryByRole('button', { name: 'Table rules' })).toBeNull();
    expect(within(menu).getByRole('button', { name: 'How to play' })).toBeTruthy();
  });

  it('reads FinishedStateView.lobbyRules on the finished board (EndScreen)', async () => {
    // Game over opens after the banner timer: frozen here, so the board's menu stays on top.
    vi.useFakeTimers();
    const view = makeFinishedView({ finalTable: makeArenaView(), lobbyRules: RULES });
    const { user } = renderUi(
      <EndScreen view={view} actionReject={null} onDismissActionReject={vi.fn()} statusLabel={STATUS_LABELS.connected} nowMs={0} onLeave={vi.fn()} />,
      { advanceTimers: vi.advanceTimersByTime },
    );
    await user.click(within(await openMenu(user)).getByRole('button', { name: 'Table rules' }));
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByText('45s')).toBeTruthy();
    expect(sheet.querySelector('[data-kit-id="gambler"]')?.getAttribute('data-excluded')).toBe('true');
  });
});
