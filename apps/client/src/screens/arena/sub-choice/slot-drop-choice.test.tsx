// @vitest-environment happy-dom
/**
 * Slot-drop as select + Drop: technical spec v7 §6.7, §13 Q42 / Q56, §14.3; Appendix A
 * `slot-drop-picker`, `table-subchoice-slot-drop`, `table-slot-drop-commit-cancel`,
 * `table-subchoice-wait-slot-drop`; server `cancelSlotDrop` (L74-20).
 */
import type { SlotDropChoiceRequiredPayload } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../../test/render';
import type { ArenaCommit } from '../arena-commit';
import { ArenaScreen, type ArenaScreenProps } from '../arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from '../test-view';
import { SubChoiceSheet } from './sub-choice-sheet';

const OWN: SlotDropChoiceRequiredPayload = {
  kind: 'slot-drop',
  slotOwnerPlayerId: 'me',
  eligibleSlots: [
    { kind: 'shield', id: 'slot-shield', cardId: 'shield', isUpgraded: false },
    { kind: 'persistent', id: 'slot-poison', cardId: 'poison', isUpgraded: false },
    { kind: 'sentence', id: 'slot-sentence', cardId: 'sentence', isUpgraded: false },
  ],
  deadlineMs: 40_000,
};
const CURSE: SlotDropChoiceRequiredPayload = { ...OWN, slotOwnerPlayerId: 'p2' };
const OWN_CANCEL = 'Cancel: the new card is not activated and stays in your hand or goes back to your specials. You keep your four active cards and can still act this turn.';
const CURSE_CANCEL = 'Cancel: your Curse is not cast and goes back to your specials. p2 keeps their four active cards, and you can still act this turn.';
const TILES = ['Shield (shield)', 'Poison', 'Sentence (sentence)'] as const;

function setup(subChoice: SlotDropChoiceRequiredPayload) {
  const onResolveSubChoice = vi.fn<ArenaScreenProps['onResolveSubChoice']>();
  const props = makeArenaProps({ view: makeArenaView(), subChoice, onResolveSubChoice });
  return { onResolveSubChoice, props, ...renderUi(<ArenaScreen {...props} />) };
}
const dialog = (): HTMLElement => screen.getByRole('dialog', { name: 'Drop an active card' });
const button = (name: string): HTMLElement => within(dialog()).getByRole('button', { name });
const pressed = (names: readonly string[]): (string | null)[] => names.map((name) => button(name).getAttribute('aria-pressed'));

describe('slot-drop (§6.7 select + Drop, Q42 / Q56)', () => {
  it('lists one tile per eligible slot with the V2 captions; a tap selects and sends nothing', async () => {
    const { user, props } = setup(OWN);
    const names = ['Shield (shield)', 'Poison', 'Sentence (sentence)'];
    expect(names.map((name) => button(name).getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
    expect(button('Drop').hasAttribute('disabled')).toBe(true);
    await user.click(button('Poison'));
    expect(names.map((name) => button(name).getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expectNoArenaIntent(props);
  });

  it('Drop sends the selected slotId once', async () => {
    const { user, onResolveSubChoice } = setup(OWN);
    await user.click(button('Shield (shield)'));
    await user.click(button('Drop'));
    await user.click(button('Drop'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'slot-drop', slotId: 'slot-shield' }]]);
  });

  it('opens a slot-drop that follows a clear with nothing pressed and Drop disabled', async () => {
    const { user, props, rerender } = setup(OWN);
    await user.click(button('Poison'));
    expect(button('Poison').getAttribute('aria-pressed')).toBe('true');
    rerender(<ArenaScreen {...props} subChoice={null} />);
    rerender(<ArenaScreen {...props} subChoice={{ ...OWN }} />);
    expect(['Shield (shield)', 'Poison', 'Sentence (sentence)'].map((name) => button(name).getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
    expect(button('Drop').hasAttribute('disabled')).toBe(true);
  });

  it('Cancel sends cancel: true; Esc and the backdrop send nothing', async () => {
    const { user, props, onResolveSubChoice } = setup(OWN);
    await user.keyboard('{Escape}');
    const overlay = dialog().closest<HTMLElement>('[data-zone="sheet-overlay"]');
    if (overlay === null) throw new Error('no overlay');
    await user.click(overlay);
    expect(dialog()).not.toBeNull();
    expectNoArenaIntent(props);
    await user.click(button('Cancel'));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'slot-drop', cancel: true }]]);
  });

  it('own slots: the V2 prompt, your expiry hint and the own Cancel outcome', () => {
    setup(OWN);
    expect(within(dialog()).getByText('You have four active cards. Pick one to remove so the new card can stay.')).not.toBeNull();
    expect(within(dialog()).getByText('On expiry: your oldest droppable active card is dropped', { exact: false })).not.toBeNull();
    expect(within(dialog()).getByRole('button', { name: 'Cancel', description: OWN_CANCEL })).not.toBeNull();
  });

  it('Curse on a full victim: the prompt, the expiry hint and the Cancel outcome name the victim, and the outcome differs', () => {
    setup(CURSE);
    expect(within(dialog()).getByText('p2 has four active cards. Pick one of theirs to remove so your Curse can land.')).not.toBeNull();
    expect(within(dialog()).getByText("On expiry: p2's oldest droppable active card is dropped", { exact: false })).not.toBeNull();
    expect(within(dialog()).getByRole('button', { name: 'Cancel', description: CURSE_CANCEL })).not.toBeNull();
    expect(CURSE_CANCEL).not.toBe(OWN_CANCEL);
  });

  it('locked keeps a tile tap selecting but disables Drop and Cancel, sending nothing; unlocked, Drop sends (A.9.4)', async () => {
    const commit = vi.fn<ArenaCommit>(() => true);
    const base = { subChoice: OWN, view: makeArenaView(), nowMs: 0, commit, actionReject: null } as const;
    const { user, rerender } = renderUi(<SubChoiceSheet {...base} locked />);
    await user.click(button('Poison'));
    expect(button('Poison').getAttribute('aria-pressed')).toBe('true');
    expect([button('Drop').hasAttribute('disabled'), button('Cancel').hasAttribute('disabled')]).toEqual([true, true]);
    await user.click(button('Drop'));
    await user.click(button('Cancel'));
    expect(commit).not.toHaveBeenCalled();
    rerender(<SubChoiceSheet {...base} locked={false} />);
    await user.click(button('Drop'));
    expect(commit.mock.calls).toEqual([[{ kind: 'resolveSubChoice', payload: { kind: 'slot-drop', slotId: 'slot-poison' } }]]);
  });

  it('drops a pick that a resend no longer offers for good: re-offering the slot leaves it unpressed and Drop disabled', async () => {
    const { user, props, rerender, onResolveSubChoice } = setup(OWN);
    await user.click(button('Poison'));
    expect(button('Drop').hasAttribute('disabled')).toBe(false);
    const withoutPoison = { ...OWN, eligibleSlots: OWN.eligibleSlots.filter((slot) => slot.id !== 'slot-poison') };
    rerender(<ArenaScreen {...props} subChoice={withoutPoison} />);
    expect(within(dialog()).queryByRole('button', { name: 'Poison' })).toBeNull();
    expect(button('Drop').hasAttribute('disabled')).toBe(true);
    rerender(<ArenaScreen {...props} subChoice={{ ...OWN }} />);
    expect(pressed(TILES)).toEqual(['false', 'false', 'false']);
    expect(button('Drop').hasAttribute('disabled')).toBe(true);
    await user.click(button('Drop'));
    expect(onResolveSubChoice).not.toHaveBeenCalled();
  });
});
