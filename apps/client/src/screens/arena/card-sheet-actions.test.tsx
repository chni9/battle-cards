// @vitest-environment happy-dom
/**
 * Card sheet actions: technical spec v7 §6.6.1, §6.6.2, §6.6.4, §11 (Q39); Appendix A
 * `card-actions-dialog`, `table-use-disabled-reasons`, `table-use-target-routing`; Lot 74 Review
 * Focus 1 and 3 (L74-08). Intents are read on the `makeArenaProps` spies (the mocked connection).
 */
import type { PlayingStateView, PrivateSelfView } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import type { ActionContext } from '../../view-model/action-lock';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { makeCard, makePersistent, makeSelf } from '../../view-model/test-fixtures';
import type { ArenaCommit } from './arena-commit';
import { ArenaScreen } from './arena-screen';
import { CardSheet } from './card-sheet';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const LIVE: ActionContext = { subChoice: null, readOnly: false };

function viewWith(self: Partial<PrivateSelfView>, overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makeArenaView({ overrides: { self: makeSelf(self), ...overrides } });
}

function renderArena(view: PlayingStateView) {
  const props = makeArenaProps({ view });
  return { ...renderUi(<ArenaScreen {...props} />), props };
}

async function openCard(user: UserEvent, group: 'Hand' | 'Specials', card: string, title: string | RegExp): Promise<HTMLElement> {
  await user.click(within(screen.getByRole('list', { name: group })).getByRole('button', { name: card }));
  return screen.getByRole('dialog', { name: title });
}

function expectDisabled(sheet: HTMLElement, name: string, reason: string): void {
  expect(within(sheet).getByRole('button', { name, description: reason }).getAttribute('aria-disabled')).toBe('true');
}

describe('card sheet actions (L74-08)', () => {
  it('Use on Poison sends one playCard {instanceId} and closes; Upgrade shows its reason; no Sell on a special', async () => {
    const { user, props } = renderArena(viewWith({ points: 8, specialCards: [makeCard('poison')] }));
    const sheet = await openCard(user, 'Specials', 'Poison', 'Poison');
    expectDisabled(sheet, 'Upgrade minus 1 upgrade point', DISABLED_REASON_COPY['no-upgrade-point']);
    expect(within(sheet).queryByRole('button', { name: /^Sell/ })).toBeNull();
    const use = within(sheet).getByRole('button', { name: 'Use minus 8 pts' });
    expect(within(use).getByText('−8')).not.toBeNull();
    await user.click(use);
    expect(vi.mocked(props.onPlayCard).mock.calls).toStrictEqual([['poison-1']]);
    expect(screen.queryByRole('dialog', { name: 'Poison' })).toBeNull();
  });

  it('sends upgradeCard, then sellCard once the upgraded state arrives, each once (§6.6.1)', async () => {
    const { user, props, rerender } = renderArena(viewWith({ upgradePoints: 1, hand: [makeCard('spy')] }));
    let sheet = await openCard(user, 'Hand', 'Spy', 'Spy');
    const use = within(sheet).getByRole('button', { name: 'Use minus 2 pts' });
    const upgrade = within(sheet).getByRole('button', { name: 'Upgrade minus 1 upgrade point' });
    const sell = within(sheet).getByRole('button', { name: 'Sell plus 2 pts' });
    expect(within(sheet).getAllByRole('button', { name: /^(Use|Upgrade|Sell)\b/ })).toEqual([use, upgrade, sell]);
    await user.click(upgrade);
    expect(vi.mocked(props.onUpgradeCard).mock.calls).toStrictEqual([['spy-1']]);
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
    rerender(<ArenaScreen {...props} view={viewWith({ hand: [makeCard('spy', { isUpgraded: true })] })} />);
    sheet = await openCard(user, 'Hand', 'Spy upgraded', 'Spy');
    expect(within(sheet).queryByRole('button', { name: /^Upgrade/ })).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Sell plus 2 pts' }));
    expect(vi.mocked(props.onSellCard).mock.calls).toStrictEqual([['spy-1']]);
    expect(props.onPlayCard).not.toHaveBeenCalled();
  });

  it('disables a hostile Use under own Invisibility and keeps Upgrade and Sell (L58-06)', async () => {
    const { user, props } = renderArena(viewWith({
      points: 5,
      upgradePoints: 1,
      hand: [makeCard('basic-attack')],
      activePersistentEffects: [makePersistent({ id: 'eff-invisibility', cardId: 'invisibility', counter: 3 })],
    }));
    const sheet = await openCard(user, 'Hand', 'Basic attack, 1 damage', 'Basic attack');
    expectDisabled(sheet, 'Use minus 1 pt', DISABLED_REASON_COPY.invisibility);
    expect(within(sheet).getByRole('button', { name: 'Upgrade minus 1 upgrade point' }).getAttribute('aria-disabled')).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Sell plus 1 pt' }));
    expect(vi.mocked(props.onSellCard).mock.calls).toStrictEqual([['basic-attack-1']]);
    expect(props.onPlayCard).not.toHaveBeenCalled();
  });

  it('disables Card Transformer Use with nothing to consume, with its reason (§11)', async () => {
    const { user, props } = renderArena(viewWith({ points: 2, specialCards: [makeCard('card-transformer')] }));
    const sheet = await openCard(user, 'Specials', 'Card Transformer', 'Card Transformer');
    expectDisabled(sheet, 'Use minus 2 pts', DISABLED_REASON_COPY['nothing-to-consume']);
    expectNoArenaIntent(props);
  });

  it('disables every action off-turn with Not your turn', async () => {
    const { user, props } = renderArena(viewWith(
      { points: 10, upgradePoints: 1, hand: [makeCard('spy')] },
      { currentTurnPlayerId: 'p1' },
    ));
    const sheet = await openCard(user, 'Hand', 'Spy', 'Spy');
    for (const name of ['Use minus 2 pts', 'Upgrade minus 1 upgrade point', 'Sell plus 2 pts']) {
      expectDisabled(sheet, name, DISABLED_REASON_COPY['not-your-turn']);
    }
    expect(within(sheet).getAllByText(DISABLED_REASON_COPY['not-your-turn'])).toHaveLength(3);
    expectNoArenaIntent(props);
  });

  it('keeps focus on Use when the turn passes under it: Use stays focusable, disabled with its reason, and sends nothing (L74-26 gate G9)', async () => {
    const view = viewWith({ points: 8, hand: [makeCard('tax')] });
    const { user, props, rerender } = renderArena(view);
    const sheet = await openCard(user, 'Hand', 'Tax', 'Tax');
    const use = within(sheet).getByRole('button', { name: /^Use/ });
    use.focus();
    const offTurn = { ...view, currentTurnPlayerId: 'p1' };
    rerender(<ArenaScreen {...props} view={offTurn} />);
    const after = within(screen.getByRole('dialog', { name: 'Tax' })).getByRole('button', { name: /^Use/, description: DISABLED_REASON_COPY['not-your-turn'] });
    expect(document.activeElement).toBe(after);
    expect(after.getAttribute('aria-disabled')).toBe('true');
    await user.click(after);
    expectNoArenaIntent(props);
  });

  it('sends nothing when the sheet opens and closes (§6.6.4)', async () => {
    const { user, props } = renderArena(viewWith({ points: 10, hand: [makeCard('spy')] }));
    await openCard(user, 'Hand', 'Spy', 'Spy');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
    expectNoArenaIntent(props);
  });

  it('sends nothing on Use for a targeted card until a target is chosen (§6.6.2)', async () => {
    const { user, props } = renderArena(viewWith({ points: 2, hand: [makeCard('spy')] }));
    const sheet = await openCard(user, 'Hand', 'Spy', 'Spy');
    const use = within(sheet).getByRole('button', { name: 'Use minus 2 pts' });
    expect(use.getAttribute('aria-disabled')).toBeNull();
    await user.click(use);
    expectNoArenaIntent(props);
  });

  it('sends one playCard for a double tap on Use (Review Focus 3)', async () => {
    const { user, props } = renderArena(viewWith({ points: 8, specialCards: [makeCard('poison')] }));
    const sheet = await openCard(user, 'Specials', 'Poison', 'Poison');
    await user.dblClick(within(sheet).getByRole('button', { name: 'Use minus 8 pts' }));
    expect(props.onPlayCard).toHaveBeenCalledTimes(1);
  });

  it('turns the sheet read-only when its card leaves the hand, so no intent names it (Review Focus 1)', async () => {
    const { user, props, rerender } = renderArena(viewWith({ points: 8, specialCards: [makeCard('poison')] }));
    const sheet = await openCard(user, 'Specials', 'Poison', 'Poison');
    const staleUse = within(sheet).getByRole('button', { name: 'Use minus 8 pts' });
    rerender(<ArenaScreen {...props} view={viewWith({ points: 8, specialCards: [] })} />);
    const after = screen.getByRole('dialog', { name: 'Poison' });
    expect(within(after).queryByRole('button', { name: /^(Use|Upgrade|Sell)\b/ })).toBeNull();
    // Belt-and-braces: after the rerender `staleUse` is detached, so this click cannot reach React.
    // The proof is the `queryByRole(...)` line above: the live panel has no action left.
    fireEvent.click(staleUse);
    expectNoArenaIntent(props);
  });

  it('hands a targeted Use to onBeginTargeting and commits nothing (the L74-10 seam)', async () => {
    const commit = vi.fn<ArenaCommit>(() => true);
    const onBeginTargeting = vi.fn<(request: { instanceId: string; seatIds: readonly string[] }) => void>();
    const onClose = vi.fn();
    const { user } = renderUi(
      <CardSheet
        open
        source={{ kind: 'hand', instance: makeCard('spy') }}
        view={viewWith({ points: 2, hand: [makeCard('spy')] })}
        ctx={LIVE}
        onClose={onClose}
        commit={commit}
        onBeginTargeting={onBeginTargeting}
      />,
    );
    await user.click(within(screen.getByRole('dialog', { name: 'Spy' })).getByRole('button', { name: 'Use minus 2 pts' }));
    expect(onBeginTargeting.mock.calls).toStrictEqual([[{ instanceId: 'spy-1', seatIds: ['p1', 'p2'] }]]);
    expect(commit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a held card commits with its instanceId as the commit context (A.9.3, L74-17)', async () => {
    const commit = vi.fn<ArenaCommit>(() => true);
    const { user } = renderUi(
      <CardSheet open source={{ kind: 'special', instance: makeCard('poison') }} view={viewWith({ points: 8, specialCards: [makeCard('poison')] })} ctx={LIVE} onClose={vi.fn()} commit={commit} />,
    );
    await user.click(within(screen.getByRole('dialog', { name: 'Poison' })).getByRole('button', { name: 'Use minus 8 pts' }));
    expect(commit.mock.calls).toStrictEqual([[{ kind: 'playCard', payload: { instanceId: 'poison-1' } }, { instanceId: 'poison-1' }]]);
  });
});
