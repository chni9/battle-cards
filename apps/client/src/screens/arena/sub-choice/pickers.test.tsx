// @vitest-environment happy-dom
/**
 * Steal, pool, special and Reanimation kit pickers on the sub-choice host: technical spec v7 §6.7,
 * §6.3, §11; Appendix A `table-subchoice-steal-pick`, `table-subchoice-pool-pick`,
 * `table-subchoice-special-pick`, `table-subchoice-reanimation-kit`,
 * `table-subchoice-wait-reanimation-kit`; Lot 74 Part 2 Review Focus 2 (L74-19).
 */
import type {
  PlayingStateView, PoolPickChoiceRequiredPayload, ReanimationKitChoiceRequiredPayload, SpecialPickChoiceRequiredPayload,
  StealPickChoiceRequiredPayload, SubChoiceRequiredPayload,
} from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../../test/render';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { makeCard } from '../../../view-model/test-fixtures';
import type { ArenaCommit } from '../arena-commit';
import { ArenaScreen, type ArenaScreenProps } from '../arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView, type ArenaPov } from '../test-view';
import { SubChoiceSheet } from './sub-choice-sheet';

const steal = (ids: readonly string[]): StealPickChoiceRequiredPayload =>
  ({ kind: 'steal-pick', victimPlayerId: 'p1', eligibleInstanceIds: ids, deadlineMs: 40_000 });
const pool = (ids: readonly string[]): PoolPickChoiceRequiredPayload =>
  ({ kind: 'pool-pick', eligibleInstanceIds: ids, maxCount: 2, deadlineMs: 40_000 });
const SPECIAL: SpecialPickChoiceRequiredPayload = { kind: 'special-pick', eligibleCardIds: ['cloning', 'block', 'poison'], deadlineMs: 40_000 };
const KIT: ReanimationKitChoiceRequiredPayload = { kind: 'reanimation-kit', eligibleKitIds: ['assassin', 'witch', 'ghost'], deadlineMs: 40_000 };
const POOL_VIEW = (): PlayingStateView => makeArenaView({ overrides: { pool: [
  makeCard('tax', { instanceId: 'pool-tax' }), makeCard('spy', { instanceId: 'pool-spy' }),
  makeCard('thief', { instanceId: 'pool-thief' }), makeCard('shield', { instanceId: 'pool-shield' }),
] } });

function setup(view: PlayingStateView, subChoice: SubChoiceRequiredPayload) {
  const onResolveSubChoice = vi.fn<ArenaScreenProps['onResolveSubChoice']>();
  const props = makeArenaProps({ view, subChoice, onResolveSubChoice });
  return { onResolveSubChoice, props, ...renderUi(<ArenaScreen {...props} />) };
}
const sheet = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const button = (dialog: HTMLElement, name: string): HTMLElement => within(dialog).getByRole('button', { name });
const pressedOf = (dialog: HTMLElement, names: readonly string[]): (string | null)[] =>
  names.map((name) => button(dialog, name).getAttribute('aria-pressed'));

describe('steal pick (§6.7, §6.3, L44-05)', () => {
  it('shows the Spy+ faces, preselects the first and sends the tapped instanceId', async () => {
    const { user, onResolveSubChoice } = setup(makeArenaView({ tiers: { p1: 'spy-plus' } }), steal(['p1-basic-attack', 'p1-spy']));
    const dialog = sheet('Steal a card');
    expect(within(dialog).getByText('Choose a card to steal from p1.')).not.toBeNull();
    expect(pressedOf(dialog, ['Basic attack', 'Spy'])).toEqual(['true', 'false']);
    await user.click(button(dialog, 'Spy'));
    await user.click(button(dialog, 'Confirm steal'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'steal-pick', instanceId: 'p1-spy' }]]);
  });

  it("a base-Spy steal shows only 'Hidden card' versos and never an instance id (Q54)", async () => {
    const { user, onResolveSubChoice } = setup(makeArenaView({ tiers: { p1: 'base-spy' } }), steal(['stolen-a', 'stolen-b']));
    const dialog = sheet('Steal a card');
    const tiles = within(dialog).getAllByRole('button', { name: 'Hidden card' });
    expect(tiles.map((tile) => [tile.querySelector('[data-card-face]')?.getAttribute('data-card-face'), tile.getAttribute('aria-pressed')]))
      .toEqual([['hidden', 'true'], ['hidden', 'false']]);
    expect(tiles.map((tile) => tile.textContent)).toEqual(['Hidden card', 'Hidden card']);
    expect(dialog.outerHTML).not.toMatch(/stolen-[ab]/);
    const [, second] = tiles;
    if (second === undefined) throw new Error('no second tile');
    await user.click(second);
    await user.click(button(dialog, 'Confirm steal'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'steal-pick', instanceId: 'stolen-b' }]]);
  });
});

describe('pool pick (§6.7, L44-05)', () => {
  it('offers only eligible pool cards, nothing preselected; extras grey at maxCount and Confirm needs exactly maxCount', async () => {
    const { user, onResolveSubChoice } = setup(POOL_VIEW(), pool(['pool-tax', 'pool-spy', 'pool-thief']));
    const dialog = sheet('Recover from pool');
    expect(pressedOf(dialog, ['Tax', 'Spy', 'Thief'])).toEqual(['false', 'false', 'false']);
    expect(within(dialog).queryByRole('button', { name: 'Shield' })).toBeNull();
    expect(within(dialog).getByText('Select exactly 2 cards from the shared pool (0/2 selected).')).not.toBeNull();
    const confirm = button(dialog, 'Confirm recovery');
    expect(confirm.hasAttribute('disabled')).toBe(true);
    await user.click(button(dialog, 'Tax'));
    await user.click(button(dialog, 'Spy'));
    expect(button(dialog, 'Thief').getAttribute('aria-disabled')).toBe('true');
    await user.click(button(dialog, 'Thief'));
    expect(button(dialog, 'Thief').getAttribute('aria-pressed')).toBe('false');
    await user.click(button(dialog, 'Spy'));
    expect(button(dialog, 'Thief').hasAttribute('aria-disabled')).toBe(false);
    await user.click(button(dialog, 'Thief'));
    expect(within(dialog).getByText('Select exactly 2 cards from the shared pool (2/2 selected).')).not.toBeNull();
    await user.click(confirm);
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'pool-pick', instanceIds: ['pool-tax', 'pool-thief'] }]]);
  });

  it('shows the empty copy and never enables Confirm with no eligible card', async () => {
    const { user, props } = setup(POOL_VIEW(), pool([]));
    const dialog = sheet('Recover from pool');
    expect(within(dialog).getByText('No eligible cards in the pool.')).not.toBeNull();
    await user.click(button(dialog, 'Confirm recovery'));
    expectNoArenaIntent(props);
  });

  it('drops a pick a resend no longer offers, so Confirm waits for a new one (Review Focus 2)', async () => {
    const { user, props, rerender, onResolveSubChoice } = setup(POOL_VIEW(), pool(['pool-tax', 'pool-spy', 'pool-thief']));
    await user.click(button(sheet('Recover from pool'), 'Tax'));
    await user.click(button(sheet('Recover from pool'), 'Spy'));
    rerender(<ArenaScreen {...props} subChoice={pool(['pool-tax', 'pool-thief'])} />);
    const dialog = sheet('Recover from pool');
    expect(within(dialog).queryByRole('button', { name: 'Spy' })).toBeNull();
    expect(within(dialog).getByText('Select exactly 2 cards from the shared pool (1/2 selected).')).not.toBeNull();
    expect(button(dialog, 'Confirm recovery').hasAttribute('disabled')).toBe(true);
    await user.click(button(dialog, 'Thief'));
    await user.click(button(dialog, 'Confirm recovery'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'pool-pick', instanceIds: ['pool-tax', 'pool-thief'] }]]);
  });

  it('keeps a dropped pick out when a later resend offers it again, so the count never exceeds maxCount (Review Focus 2)', async () => {
    const { user, props, rerender, onResolveSubChoice } = setup(POOL_VIEW(), pool(['pool-tax', 'pool-spy', 'pool-thief']));
    await user.click(button(sheet('Recover from pool'), 'Tax'));
    await user.click(button(sheet('Recover from pool'), 'Spy'));
    rerender(<ArenaScreen {...props} subChoice={pool(['pool-tax', 'pool-thief'])} />);
    await user.click(button(sheet('Recover from pool'), 'Thief'));
    rerender(<ArenaScreen {...props} subChoice={pool(['pool-tax', 'pool-spy', 'pool-thief'])} />);
    const dialog = sheet('Recover from pool');
    expect(within(dialog).getByText('Select exactly 2 cards from the shared pool (2/2 selected).')).not.toBeNull();
    expect(pressedOf(dialog, ['Tax', 'Spy', 'Thief'])).toEqual(['true', 'false', 'true']);
    await user.click(button(dialog, 'Confirm recovery'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'pool-pick', instanceIds: ['pool-tax', 'pool-thief'] }]]);
  });
});

describe('special pick (§6.7, L44-05)', () => {
  it('lists exactly the server specials by catalog name, the first preselected, and Confirm alone sends it', async () => {
    const { user, onResolveSubChoice } = setup(makeArenaView(), SPECIAL);
    const dialog = sheet('Choose a special');
    expect(within(dialog).getByText('Choose which special card to receive.')).not.toBeNull();
    expect(within(within(dialog).getByRole('list')).getAllByRole('button').map((tile) => tile.getAttribute('aria-label')))
      .toEqual(['Cloning', 'Block', 'Poison']);
    expect(pressedOf(dialog, ['Cloning', 'Block', 'Poison'])).toEqual(['true', 'false', 'false']);
    expect(within(dialog).queryByRole('button', { name: 'Card Transformer' })).toBeNull();
    await user.click(button(dialog, 'Confirm special'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'special-pick', cardId: 'cloning' }]]);
  });

  it('sends the tapped special', async () => {
    const { user, onResolveSubChoice } = setup(makeArenaView(), SPECIAL);
    await user.click(button(sheet('Choose a special'), 'Poison'));
    await user.click(button(sheet('Choose a special'), 'Confirm special'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'special-pick', cardId: 'poison' }]]);
  });
});

describe('Reanimation kit (§6.7, §11, L44-06, L26-02)', () => {
  it('shows kit tiles with portrait and name, aria-pressed on the first, and sends the tapped kit', async () => {
    const { user, onResolveSubChoice } = setup(makeArenaView({ pov: 'reanimating' }), KIT);
    const dialog = sheet('Choose a kit');
    expect(within(dialog).getByText('Choose which kit to revive with.')).not.toBeNull();
    expect(pressedOf(dialog, ['Assassin', 'Witch', 'Ghost'])).toEqual(['true', 'false', 'false']);
    expect(button(dialog, 'Witch').closest('[data-selected]')?.querySelector('img')?.getAttribute('alt')).toBe('Witch');
    await user.click(button(dialog, 'Witch'));
    await user.click(button(dialog, 'Confirm kit'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'reanimation-kit', kitId: 'witch' }]]);
  });

  it.each<ArenaPov>(['eliminated', 'reanimating'])('renders for an eliminated POV (%s) and sends the first kit', async (pov) => {
    const { user, onResolveSubChoice } = setup(makeArenaView({ pov }), KIT);
    await user.click(button(sheet('Choose a kit'), 'Confirm kit'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'reanimation-kit', kitId: 'assassin' }]]);
  });
});

describe('the commit lock (A.9.4; L74-25 sets it while reconnecting)', () => {
  it.each<{ title: string; confirm: string; view: () => PlayingStateView; subChoice: SubChoiceRequiredPayload }>([
    { title: 'Steal a card', confirm: 'Confirm steal', view: () => makeArenaView({ tiers: { p1: 'spy-plus' } }), subChoice: steal(['p1-basic-attack', 'p1-spy']) },
    { title: 'Choose a special', confirm: 'Confirm special', view: () => makeArenaView(), subChoice: SPECIAL },
    { title: 'Choose a kit', confirm: 'Confirm kit', view: () => makeArenaView({ pov: 'reanimating' }), subChoice: KIT },
  ])('a locked $title sheet disables $confirm with its reason and sends nothing', async ({ title, confirm, view, subChoice }) => {
    const commit = vi.fn<ArenaCommit>();
    const { user } = renderUi(<SubChoiceSheet subChoice={subChoice} view={view()} nowMs={0} commit={commit} actionReject={null} locked />);
    const locked = within(sheet(title)).getByRole('button', { name: confirm, description: DISABLED_REASON_COPY['actions-locked'] });
    expect(locked.hasAttribute('disabled')).toBe(true);
    await user.click(locked);
    expect(commit).not.toHaveBeenCalled();
  });
});
