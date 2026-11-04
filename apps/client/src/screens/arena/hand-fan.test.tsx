// @vitest-environment happy-dom
/**
 * Hand fan: technical spec v7 §5.4, §6.1 item 4, §6.6.1, §6.6.4, §6.6.5; Appendix A `card-band`,
 * `global-card-face` (L74-07).
 */
import type { PlayingStateView, PrivateSelfView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { act, fireEvent, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import type { ActionContext } from '../../view-model/action-lock';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { makeCard, makePersistent, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen } from './arena-screen';
import { HandFan, type HandFanProps } from './hand-fan';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };

function viewWith(self: Partial<PrivateSelfView>, overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makeArenaView({ overrides: { self: makeSelf(self), ...overrides } });
}

function fan(view: PlayingStateView, props: Partial<HandFanProps> = {}): ReactElement {
  return <HandFan view={view} ctx={LIVE} selectedInstanceId={null} onOpenCard={vi.fn()} {...props} />;
}

function group(name: 'Hand' | 'Specials'): HTMLElement {
  return screen.getByRole('list', { name });
}

function labels(list: HTMLElement): (string | null)[] {
  return within(list).getAllByRole('button').map((card) => card.getAttribute('aria-label'));
}

function flipOf(container: HTMLElement, instanceId: string): Element | null {
  return container.querySelector(`[data-instance-id="${instanceId}"]`)?.closest('[data-upgrade-flip]') ?? null;
}

describe('HandFan (L74-07)', () => {
  it('renders attacks, then actions, then the specials group with gold rims (§6.1 item 4)', () => {
    renderUi(fan(viewWith({
      hand: [makeCard('spy'), makeCard('basic-attack'), makeCard('shield'), makeCard('strong-attack')],
      specialCards: [makeCard('poison'), makeCard('block')],
    })));
    const hand = group('Hand');
    const specials = group('Specials');
    expect(labels(hand)).toEqual(['Basic attack, 1 damage', 'Strong attack, 2 damage', 'Spy', 'Shield']);
    expect(labels(specials)).toEqual(['Poison', 'Block']);
    expect(within(hand).getAllByRole('button').map((card) => card.getAttribute('data-instance-id')))
      .toEqual(['basic-attack-1', 'strong-attack-1', 'spy-1', 'shield-1']);
    expect(within(hand).getAllByRole('button').every((card) => card.getAttribute('data-card-rim') === 'holo')).toBe(true);
    expect(within(specials).getAllByRole('button').every((card) => card.getAttribute('data-card-rim') === 'gold')).toBe(true);
    expect(hand.compareDocumentPosition(specials)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(hand.closest('[data-zone="hand"]')?.getAttribute('data-hint-anchor')).toBe('hand');
    expect(specials.closest('[data-zone="specials"]')?.getAttribute('data-hint-anchor')).toBe('specials');
    expect(document.querySelector('[data-card-row]')).toBeNull();
  });

  it('desaturates no card off-turn, even an unaffordable one (§5.4)', () => {
    const { container } = renderUi(fan(viewWith(
      { points: 0, hand: [makeCard('super-attack'), makeCard('spy')], specialCards: [makeCard('poison')] },
      { currentTurnPlayerId: 'p1' },
    )));
    expect(container.querySelectorAll('[data-unplayable]')).toHaveLength(0);
  });

  it('on the POV turn desaturates only a card whose Use fails for a card-specific reason, described by it', () => {
    renderUi(fan(viewWith({ points: 1, hand: [makeCard('basic-attack'), makeCard('strong-attack')] })));
    const hand = group('Hand');
    const strong = within(hand).getByRole('button', {
      name: 'Strong attack, 2 damage',
      description: DISABLED_REASON_COPY['not-enough-points'],
    });
    expect(strong.getAttribute('data-unplayable')).toBe('true');
    const basic = within(hand).getByRole('button', { name: 'Basic attack, 1 damage' });
    expect(basic.hasAttribute('data-unplayable')).toBe(false);
    expect(basic.hasAttribute('aria-describedby')).toBe(false);
  });

  it('desaturates a hostile card under own Invisibility and leaves a self card playable (L58-06)', () => {
    renderUi(fan(viewWith({
      points: 20,
      hand: [makeCard('basic-attack'), makeCard('shield')],
      activePersistentEffects: [makePersistent({ id: 'eff-invisibility', cardId: 'invisibility', counter: 3 })],
    })));
    const hand = group('Hand');
    expect(within(hand).getByRole('button', {
      name: 'Basic attack, 1 damage',
      description: DISABLED_REASON_COPY.invisibility,
    }).getAttribute('data-unplayable')).toBe('true');
    expect(within(hand).getByRole('button', { name: 'Shield' }).hasAttribute('data-unplayable')).toBe(false);
  });

  it('never desaturates while actions are locked on the POV turn (open sub-choice)', () => {
    const { container } = renderUi(fan(
      viewWith({ points: 0, hand: [makeCard('super-attack')] }),
      { ctx: { subChoice: MIRROR_OPEN, readOnly: false } },
    ));
    expect(container.querySelectorAll('[data-unplayable]')).toHaveLength(0);
  });

  it('asks to open the sheet on a tap, off-turn too, with the hand or special source', async () => {
    const onOpenCard = vi.fn();
    const { user } = renderUi(fan(
      viewWith({ hand: [makeCard('spy')], specialCards: [makeCard('poison')] }, { currentTurnPlayerId: 'p1' }),
      { onOpenCard },
    ));
    await user.click(within(group('Hand')).getByRole('button', { name: 'Spy' }));
    await user.click(within(group('Specials')).getByRole('button', { name: 'Poison' }));
    expect(onOpenCard.mock.calls).toEqual([
      [{ kind: 'hand', instance: makeCard('spy') }],
      [{ kind: 'special', instance: makeCard('poison') }],
    ]);
  });

  it('marks only the selected card pressed (§5.4 selected)', () => {
    renderUi(fan(viewWith({ hand: [makeCard('basic-attack'), makeCard('spy')] }), { selectedInstanceId: 'spy-1' }));
    const hand = group('Hand');
    expect(within(hand).getByRole('button', { name: 'Spy' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(hand).getByRole('button', { name: 'Basic attack, 1 damage' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('renders the empty hand and empty specials states with their hint anchors (§6.1, Q60)', () => {
    const { container } = renderUi(fan(viewWith({ hand: [], specialCards: [] })));
    const hand = container.querySelector<HTMLElement>('[data-zone="hand"]');
    const specials = container.querySelector<HTMLElement>('[data-zone="specials"]');
    if (hand === null || specials === null) throw new Error('missing hand or specials zone');
    expect(hand.getAttribute('data-hint-anchor')).toBe('hand');
    expect(specials.getAttribute('data-hint-anchor')).toBe('specials');
    expect(within(hand).getByText('Hand')).not.toBeNull();
    expect(within(hand).getByText('Empty')).not.toBeNull();
    expect(within(specials).getByText('Specials')).not.toBeNull();
    expect(within(specials).getByText('None')).not.toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('counts an empty group caption in the strip width, so 4 to 6 cards with no specials fit at 360 px (L74-26 gate G4)', () => {
    // happy-dom has no layout or container queries: the strip width is CSS. Its budget took out
    // the scroller padding, the group gap and one card per filled group, but not the empty
    // group's 'Specials / None' caption (54 px), so the hand scrolled by that much instead of
    // overlapping tighter. The caption now has a fixed width the budget subtracts per empty group
    // (`--hand-empties`; happy-dom drops the `cqi` slot width itself, so the inputs are the check).
    const { container } = renderUi(fan(viewWith({ hand: (['spy', 'tax', 'shield', 'thief', 'mirror'] as const).map((id) => makeCard(id)), specialCards: [] })));
    const root = container.querySelector<HTMLElement>('[data-hand-fan]');
    expect([root?.style.getPropertyValue('--hand-strips'), root?.style.getPropertyValue('--hand-fulls'), root?.style.getPropertyValue('--hand-empties')]).toEqual(['4', '1', '1']);
    const caption = container.querySelector('[data-zone="specials"] p');
    // In px, as the budget subtracts px: a rem width would grow with a larger browser default font (review M8).
    expect([caption?.classList.contains('w-[56px]'), caption?.classList.contains('w-14')]).toEqual([true, false]);
  });

  it('shows only the empty states for a walk-in, whatever the filler self holds (Q38)', () => {
    renderUi(fan(makeArenaView({
      pov: 'walk-in',
      overrides: { self: makeSelf({ hand: [makeCard('spy')], specialCards: [makeCard('poison')] }) },
    })));
    expect(screen.getByText('Empty')).not.toBeNull();
    expect(screen.getByText('None')).not.toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('plays the upgrade flip when a held card upgrades, never on mount (L50-05)', () => {
    const { container, rerender } = renderUi(fan(viewWith({
      hand: [makeCard('spy'), makeCard('shield', { isUpgraded: true })],
    })));
    expect(flipOf(container, 'spy-1')?.getAttribute('data-upgrade-flip')).toBe('0');
    expect(flipOf(container, 'shield-1')?.getAttribute('data-upgrade-flip')).toBe('0');
    rerender(fan(viewWith({
      hand: [makeCard('spy', { isUpgraded: true }), makeCard('shield', { isUpgraded: true })],
    })));
    expect(flipOf(container, 'spy-1')?.getAttribute('data-upgrade-flip')).toBe('1');
    expect(flipOf(container, 'spy-1')?.getAttribute('data-motion')).toBe('full');
    expect(flipOf(container, 'shield-1')?.getAttribute('data-upgrade-flip')).toBe('0');
  });

  it('keeps the upgrade cue under reduced motion, as a fade (§8.3)', () => {
    const { container, rerender } = renderUi(fan(viewWith({ hand: [makeCard('spy')] })), { reducedMotion: true });
    rerender(fan(viewWith({ hand: [makeCard('spy', { isUpgraded: true })] })));
    expect(flipOf(container, 'spy-1')?.getAttribute('data-upgrade-flip')).toBe('1');
    expect(flipOf(container, 'spy-1')?.getAttribute('data-motion')).toBe('reduced');
  });

  it('keeps keyboard focus on a held card that upgrades: the flip animates in place (final review, Minor 6)', () => {
    const { container, rerender } = renderUi(fan(viewWith({ hand: [makeCard('spy'), makeCard('shield')] })));
    const spy = within(group('Hand')).getByRole('button', { name: 'Spy' });
    act(() => {
      spy.focus();
    });
    rerender(fan(viewWith({ hand: [makeCard('spy', { isUpgraded: true }), makeCard('shield')] })));
    expect(flipOf(container, 'spy-1')?.getAttribute('data-upgrade-flip')).toBe('1');
    expect(spy.isConnected).toBe(true);
    expect(document.activeElement).toBe(spy);
  });

  it('blocks the context menu on a face (long-press is ours, §6.6.5)', () => {
    renderUi(fan(viewWith({ hand: [makeCard('spy')] })));
    expect(fireEvent.contextMenu(within(group('Hand')).getByRole('button', { name: 'Spy' }))).toBe(false);
  });

  it('a sized hand sets --hand-card-w inline; an unsized one keeps the Card clamp (§5.4, L75-03)', () => {
    const view = viewWith({ hand: [makeCard('spy')] });
    const { unmount, container } = renderUi(fan(view, { cardWidthPx: 65 }));
    expect(container.querySelector<HTMLElement>('[data-hand-fan]')?.style.getPropertyValue('--hand-card-w')).toBe('65px');
    unmount();
    const plain = renderUi(fan(view));
    expect(plain.container.querySelector<HTMLElement>('[data-hand-fan]')?.style.getPropertyValue('--hand-card-w')).toBe('');
  });
});

describe('hand fan in the arena (L74-07)', () => {
  it('opens the card sheet on a tap, off-turn too, lifts the card and sends no intent (§6.6.4)', async () => {
    const props = makeArenaProps({ view: viewWith({ hand: [makeCard('spy')] }, { currentTurnPlayerId: 'p1' }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    const hand = group('Hand');
    expect(hand.closest('[data-arena-region="hand"]')?.getAttribute('data-zone')).toBe('card-band');
    await user.click(within(hand).getByRole('button', { name: 'Spy' }));
    expect(screen.getByRole('dialog', { name: 'Spy' })).not.toBeNull();
    expect(within(hand).getByRole('button', { name: 'Spy' }).getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
    expect(within(hand).getByRole('button', { name: 'Spy' }).getAttribute('aria-pressed')).toBe('false');
    expectNoArenaIntent(props);
  });

  it('still opens the sheet of an unplayable card on the POV turn', async () => {
    const props = makeArenaProps({ view: viewWith({ points: 0, hand: [makeCard('strong-attack')] }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    const strong = within(group('Hand')).getByRole('button', { name: 'Strong attack, 2 damage' });
    expect(strong.getAttribute('data-unplayable')).toBe('true');
    await user.click(strong);
    expect(screen.getByRole('dialog', { name: 'Strong attack' })).not.toBeNull();
    expectNoArenaIntent(props);
  });
});
