// @vitest-environment happy-dom
/**
 * Self strip and own in-play card actions: technical spec v7 §6.1 item 3, §6.6.1, §11 (Q37,
 * Q40); Appendix A `private-zone-identity`, `active-persistent-thumbs`, `sentence-chips`,
 * `table-inspect-active-upgrade`, `deactivate-confirm-dialog`,
 * `table-deactivate-confirm-escape-layer`, `global-resource-captions`,
 * `global-activated-art-guard`; Lot 74 Appendix A.8 rulings 1 and 9 (L74-09).
 */
import type {
  PendingSentenceView,
  PlayingStateView,
  PrivateSelfView,
  SubChoiceRequiredPayload,
} from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import type { ActionContext } from '../../view-model/action-lock';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { inPlayThumbs } from '../../view-model/card-actions';
import { selfStrip } from '../../view-model/self-strip';
import { makePersistent, makePlayer, makeSelf } from '../../view-model/test-fixtures';
import type { ArenaCommit } from './arena-commit';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { CardSheet } from './card-sheet';
import type { CardSheetSource } from './card-sheet-source';
import { SelfStrip } from './self-strip';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };
const POISON = makePersistent({ id: 'eff-poison', cardId: 'poison', counter: 3 });
const INVISIBILITY = makePersistent({ id: 'eff-invisibility', cardId: 'invisibility', counter: 3 });
const OWN_SENTENCE: PendingSentenceView = { id: 'sentence:3:me:1', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false };
const UPGRADE = 'Upgrade minus 1 upgrade point';

function viewWith(self: Partial<PrivateSelfView>, overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makeArenaView({ overrides: { self: makeSelf(self), ...overrides } });
}

function renderStrip(view: PlayingStateView) {
  const onOpenKit = vi.fn();
  const onOpenCard = vi.fn();
  const result = renderUi(<SelfStrip model={selfStrip(view, LIVE)} onOpenKit={onOpenKit} onOpenCard={onOpenCard} />);
  return { ...result, onOpenKit, onOpenCard };
}

function renderArena(view: PlayingStateView, extra: Partial<ArenaScreenProps> = {}) {
  const onDeactivatePersistent = vi.fn<(effectId: string) => void>();
  const props = makeArenaProps({ view, onDeactivatePersistent, ...extra });
  return { ...renderUi(<ArenaScreen {...props} />), props, onDeactivatePersistent };
}

function stripOf(container: HTMLElement): HTMLElement {
  const strip = container.querySelector<HTMLElement>('[data-arena-region="self-strip"]');
  if (strip === null) throw new Error('no self-strip region');
  return strip;
}

function renderCardSheet(source: CardSheetSource, view: PlayingStateView, commit: ArenaCommit) {
  return renderUi(<CardSheet open source={source} view={view} ctx={LIVE} onClose={vi.fn()} commit={commit} />);
}

describe('SelfStrip (L74-09)', () => {
  it('shows the four own resources under data-zone resources, with visible captions (L43-01)', () => {
    const { container } = renderStrip(viewWith({ lives: 9, shield: 4, points: 12, upgradePoints: 1 }));
    const resources = container.querySelector('[data-zone="resources"]');
    if (resources === null) throw new Error('no resources zone');
    expect(resources.getAttribute('data-hint-anchor')).toBe('resources');
    const pills = Array.from(resources.querySelectorAll('[data-resource-kind]'));
    expect(pills.map((pill) => pill.getAttribute('data-resource-kind'))).toEqual(['life', 'shield', 'point', 'upgradePoint']);
    expect(pills.map((pill) => visibleText(pill))).toEqual(['9Lives', '4Shield', '12Points', '1Upgrade points']);
    expect(pills[0]?.getAttribute('data-size')).toBe('lg');
    expect(screen.queryByText('Shield ↑')).toBeNull();
  });

  it('marks an upgraded own shield with "Shield ↑"', () => {
    renderStrip(viewWith({ shield: 7, shieldIsUpgraded: true }));
    expect(screen.getByText('Shield ↑')).not.toBeNull();
  });

  it('opens the own kit from the portrait button', async () => {
    const { user, onOpenKit } = renderStrip(viewWith({ kitId: 'tactician' }));
    const portrait = screen.getByRole('button', { name: 'Inspect your kit' });
    expect(portrait.getAttribute('data-zone')).toBe('kit-portrait');
    await user.click(portrait);
    expect(onOpenKit.mock.calls).toEqual([['tactician']]);
  });

  it('shows own flow badges, the connection label and Duplication active, in model order', () => {
    renderStrip(makeArenaView({
      overrides: {
        players: [
          makePlayer('me', {
            isYou: true,
            blockTurnsRemaining: 2,
            duplicationActive: true,
            connection: { status: 'connected', disconnectedAt: null, automaticTurnsTaken: 0, consecutiveTimeouts: 2 },
          }),
          makePlayer('p1'),
          makePlayer('p2'),
        ],
        self: makeSelf({ kitId: 'duplicator', activePersistentEffects: [INVISIBILITY] }),
      },
    }));
    const block = screen.getByText('Block · 2 left');
    const invisible = screen.getByText('Invisible');
    expect(block.compareDocumentPosition(invisible)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(invisible.parentElement?.textContent).toBe('Invisible3');
    expect(screen.getByText('idle timeouts 2/5')).not.toBeNull();
    expect(screen.getByText('Duplication active')).not.toBeNull();
    expect(screen.queryByText('Reanimating')).toBeNull();
  });

  it('shows the attack ban when no Block turn is left', () => {
    renderStrip(makeArenaView({
      overrides: { players: [makePlayer('me', { isYou: true, blockAttacksForbidden: true }), makePlayer('p1'), makePlayer('p2')] },
    }));
    expect(screen.getByText('Block · attacks banned')).not.toBeNull();
  });

  it('shows Reanimating for an eliminated POV with Reanimation armed', () => {
    renderStrip(makeArenaView({ pov: 'reanimating' }));
    expect(screen.getByText('Reanimating')).not.toBeNull();
  });

  it('lists own thumbs Shield, actives, then Sentences, with counters only for card lives and turns (ruling 1)', async () => {
    const { user, onOpenCard } = renderStrip(viewWith(
      { shield: 4, activePersistentEffects: [POISON, INVISIBILITY] },
      { pendingSentences: [OWN_SENTENCE] },
    ));
    const list = screen.getByRole('list', { name: 'Active cards' });
    const thumbs = within(list).getAllByRole('button');
    expect(thumbs.map((thumb) => thumb.getAttribute('aria-label')))
      .toEqual(['Shield', 'Poison, 3 card lives', 'Invisibility, 3 turns remaining', 'Sentence']);
    expect(thumbs.map((thumb) => thumb.querySelector('[data-card-counter]')?.getAttribute('data-card-counter') ?? null))
      .toEqual([null, 'card-lives', 'turns', null]);
    expect(thumbs.every((thumb) => !thumb.hasAttribute('aria-pressed'))).toBe(true);
    const sentence = thumbs[3]?.closest('li') ?? null;
    if (sentence === null) throw new Error('no Sentence thumb item');
    expect(within(sentence).getByText('Turns left')).not.toBeNull();
    expect(visibleText(sentence)).toBe('2');
    await user.click(within(list).getByRole('button', { name: 'Shield' }));
    expect(onOpenCard.mock.calls[0]?.[0]).toMatchObject({
      kind: 'in-play',
      thumb: { instance: { instanceId: 'active-shield', cardId: 'shield' } },
    });
  });

  it('renders nothing for a walk-in (L74-23 owns the Watching strip)', () => {
    const { container } = renderStrip(makeArenaView({ pov: 'walk-in' }));
    expect(container.innerHTML).toBe('');
  });
});

describe('self strip and in-play card sheet in the arena (L74-09)', () => {
  it('opens the kit sheet from the strip inside the private zone, sending nothing', async () => {
    const { container, user, props } = renderArena(viewWith({}));
    const strip = stripOf(container);
    expect(strip.getAttribute('data-zone')).toBe('private-zone');
    expect(strip.getAttribute('data-player-id')).toBe('me');
    expect(strip.querySelector('[data-zone="resources"] [data-resource-kind="life"]')).not.toBeNull();
    await user.click(within(strip).getByRole('button', { name: 'Inspect your kit' }));
    expect(screen.getByRole('dialog', { name: 'Kamikaze' })).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it.each<{ label: string; self: Partial<PrivateSelfView>; sentences: readonly PendingSentenceView[]; thumb: string; title: string; instanceId: string }>([
    { label: 'an own active (its effect id)', self: { upgradePoints: 1, activePersistentEffects: [POISON] }, sentences: [], thumb: 'Poison, 3 card lives', title: 'Poison', instanceId: 'eff-poison' },
    { label: 'the own Shield (active-shield)', self: { upgradePoints: 1, shield: 4 }, sentences: [], thumb: 'Shield', title: 'Shield', instanceId: 'active-shield' },
    { label: 'an own ticking Sentence (its id)', self: { upgradePoints: 1 }, sentences: [OWN_SENTENCE], thumb: 'Sentence', title: 'Sentence', instanceId: 'sentence:3:me:1' },
  ])('Upgrade on $label sends one upgradeCard', async ({ self, sentences, thumb, title, instanceId }) => {
    const { container, user, props } = renderArena(viewWith(self, { pendingSentences: sentences }));
    await user.click(within(stripOf(container)).getByRole('button', { name: thumb }));
    const sheet = screen.getByRole('dialog', { name: title });
    expectNoArenaIntent(props);
    await user.click(within(sheet).getByRole('button', { name: UPGRADE }));
    expect(vi.mocked(props.onUpgradeCard).mock.calls).toStrictEqual([[instanceId]]);
    expect(screen.queryByRole('dialog', { name: title })).toBeNull();
  });

  it('sends deactivatePersistent only from the confirm, once for a double tap, and closes both sheets (Lot 69)', async () => {
    const { container, user, props, onDeactivatePersistent } = renderArena(viewWith({ activePersistentEffects: [POISON] }));
    await user.click(within(stripOf(container)).getByRole('button', { name: 'Poison, 3 card lives' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Poison' })).getByRole('button', { name: 'Deactivate' }));
    const confirm = screen.getByRole('dialog', { name: 'Are you sure?' });
    expect(within(confirm).getByText('This card will be lost. This does not cost a turn.')).not.toBeNull();
    expectNoArenaIntent(props);
    await user.dblClick(within(confirm).getByRole('button', { name: 'Deactivate' }));
    expect(onDeactivatePersistent.mock.calls).toStrictEqual([['eff-poison']]);
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Poison' })).toBeNull();
  });

  it('closes only the confirm on Esc or Cancel and keeps the card sheet open, sending nothing (Lot 69)', async () => {
    const { container, user, props } = renderArena(viewWith({ activePersistentEffects: [POISON] }));
    await user.click(within(stripOf(container)).getByRole('button', { name: 'Poison, 3 card lives' }));
    const sheet = screen.getByRole('dialog', { name: 'Poison' });
    await user.click(within(sheet).getByRole('button', { name: 'Deactivate' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Poison' })).not.toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Deactivate' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Poison' })).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('closes the confirm when its persistent leaves, and never shows it again by itself (final review, Minor 4)', async () => {
    const withPoison = viewWith({ activePersistentEffects: [POISON] });
    const without = viewWith({});
    const thumb = inPlayThumbs(withPoison, 'me').find((entry) => entry.instance.instanceId === 'eff-poison');
    if (thumb === undefined) throw new Error('no Poison thumb');
    const commit = vi.fn<ArenaCommit>(() => true);
    const sheet = (open: boolean, view: PlayingStateView): ReactElement => (
      <CardSheet open={open} source={{ kind: 'in-play', thumb }} view={view} ctx={LIVE} onClose={vi.fn()} commit={commit} />
    );
    const confirm = (): HTMLElement | null => screen.queryByRole('dialog', { name: 'Are you sure?' });
    const { user, rerender } = renderUi(sheet(true, withPoison));
    await user.click(within(screen.getByRole('dialog', { name: 'Poison' })).getByRole('button', { name: 'Deactivate' }));
    expect(confirm()).not.toBeNull();
    rerender(sheet(true, without));
    expect(confirm()).toBeNull();
    // The sheet closes; the same card comes back (same key, the sheet is reused): no confirm while
    // closed, and none on the reopen until Deactivate is pressed again.
    rerender(sheet(false, without));
    rerender(sheet(false, withPoison));
    expect(confirm()).toBeNull();
    rerender(sheet(true, withPoison));
    expect(screen.getByRole('dialog', { name: 'Poison' })).not.toBeNull();
    expect(confirm()).toBeNull();
    expect(commit).not.toHaveBeenCalled();
  });

  it('disables Deactivate with its reason while a sub-choice is open (Q40)', async () => {
    const { container, user, props } = renderArena(viewWith({ activePersistentEffects: [POISON] }), { subChoice: MIRROR_OPEN });
    await user.click(within(stripOf(container)).getByRole('button', { name: 'Poison, 3 card lives' }));
    const deactivate = within(screen.getByRole('dialog', { name: 'Poison' }))
      .getByRole('button', { name: 'Deactivate', description: DISABLED_REASON_COPY['actions-locked'] });
    expect(deactivate.hasAttribute('disabled')).toBe(true);
    await user.click(deactivate);
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).toBeNull();
    expectNoArenaIntent(props);
  });

  it('disables in-play actions off-turn and never offers Deactivate on Shield or Sentence', async () => {
    const view = viewWith(
      { upgradePoints: 1, shield: 4, activePersistentEffects: [POISON] },
      { currentTurnPlayerId: 'p1', pendingSentences: [OWN_SENTENCE] },
    );
    const { container, user } = renderArena(view);
    const strip = stripOf(container);
    await user.click(within(strip).getByRole('button', { name: 'Poison, 3 card lives' }));
    const poison = screen.getByRole('dialog', { name: 'Poison' });
    for (const name of [UPGRADE, 'Deactivate']) {
      expect(within(poison).getByRole('button', { name, description: DISABLED_REASON_COPY['not-your-turn'] })
        .hasAttribute('disabled')).toBe(true);
    }
    await user.keyboard('{Escape}');
    for (const name of ['Shield', 'Sentence'] as const) {
      await user.click(within(strip).getByRole('button', { name }));
      const sheet = screen.getByRole('dialog', { name });
      expect(within(sheet).getByRole('button', { name: UPGRADE })).not.toBeNull();
      expect(within(sheet).queryByRole('button', { name: 'Deactivate' })).toBeNull();
      await user.keyboard('{Escape}');
    }
  });

  it('shows Upgrade disabled (Actions locked) on the leftover Shield of an eliminated Watching POV (ruling 9)', async () => {
    const { container, user } = renderArena(makeArenaView({
      pov: 'eliminated',
      overrides: { self: makeSelf({ shield: 4, upgradePoints: 1 }) },
    }));
    await user.click(within(stripOf(container)).getByRole('button', { name: 'Shield' }));
    expect(within(screen.getByRole('dialog', { name: 'Shield' }))
      .getByRole('button', { name: UPGRADE, description: DISABLED_REASON_COPY['actions-locked'] })
      .hasAttribute('disabled')).toBe(true);
  });

  it('offers no Upgrade on an opponent base Shield while the own base Shield offers it (Q37 regression)', async () => {
    const view = makeArenaView({
      overrides: {
        self: makeSelf({ shield: 4, upgradePoints: 1 }),
        players: [makePlayer('me', { isYou: true }), makePlayer('p1', { activeShield: { isUpgraded: false } }), makePlayer('p2')],
      },
    });
    const [opponentShield] = inPlayThumbs(view, 'p1');
    const [ownShield] = inPlayThumbs(view, 'me');
    if (opponentShield === undefined || ownShield === undefined) throw new Error('missing Shield thumbs');
    const commit = vi.fn<ArenaCommit>(() => true);
    const first = renderCardSheet({ kind: 'in-play', thumb: opponentShield }, view, commit);
    expect(within(screen.getByRole('dialog', { name: 'Shield' })).queryByRole('button', { name: /^Upgrade/ })).toBeNull();
    first.unmount();
    const { user } = renderCardSheet({ kind: 'in-play', thumb: ownShield }, view, commit);
    await user.click(within(screen.getByRole('dialog', { name: 'Shield' })).getByRole('button', { name: UPGRADE }));
    expect(commit.mock.calls).toStrictEqual([[{ kind: 'upgradeCard', payload: { instanceId: 'active-shield' } }]]);
  });
});
