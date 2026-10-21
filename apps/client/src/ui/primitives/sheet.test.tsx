// @vitest-environment happy-dom
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { MINIMIZE_LABEL } from '../ui-copy';
import { Sheet } from './sheet';
import { Tooltip } from './tooltip';

const noop = (): void => undefined;
function zone(root: ParentNode, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-zone="${name}"]`);
  if (element === null) { throw new Error(`missing data-zone="${name}"`); }
  return element;
}
function overlayOf(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) { throw new Error('dialog has no sheet overlay'); }
  return overlay;
}
const dialog = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const noDialog = (name: string): HTMLElement | null => screen.queryByRole('dialog', { name });
const button = (name: string): HTMLElement => screen.getByRole('button', { name });
const focused = (): Element | null => document.activeElement;
const inert = (element: HTMLElement): boolean => element.hasAttribute('inert');
const z = (element: HTMLElement): number => Number(element.style.zIndex);
function swipeDown(panel: HTMLElement, distancePx: number): void {
  const handle = zone(panel, 'sheet-handle');
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 100 + distancePx });
}
function Ro({ title, onClose = noop, open = true, children = <p>Effect</p> }: { title: string; onClose?: () => void; open?: boolean; children?: ReactNode }): ReactElement {
  return <Sheet open={open} mode="read-only" title={title} onClose={onClose}>{children}</Sheet>;
}
const REWARD = <Sheet open mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet>;
function OpenerHarness(): ReactElement {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => { setOpen(true); }}>Open card</button>
    <Ro title="Card" open={open} onClose={() => { setOpen(false); }}><button type="button">Use</button><button type="button">Sell</button></Ro></>;
}
function StackedHarness(): ReactElement {
  const [kitOpen, setKitOpen] = useState(false);
  return <><Ro title="Card"><button type="button" onClick={() => { setKitOpen(true); }}>Show kit</button></Ro>
    {kitOpen ? <Ro title="Kit" onClose={() => { setKitOpen(false); }}><button type="button">Kit info</button></Ro> : null}</>;
}

describe('Sheet stack contract (spec v7 §6.7)', () => {
  it('closes only the top read-only sheet on Esc (Q49)', async () => {
    const [closeCard, closeKit] = [vi.fn(), vi.fn()];
    const ui = (kitOpen: boolean): ReactElement => <><Ro title="Card" onClose={closeCard}><button type="button">Use</button></Ro>
      <Ro title="Kit" open={kitOpen} onClose={closeKit}><button type="button">Info</button></Ro></>;
    const { user, rerender } = renderUi(ui(true));
    await user.keyboard('{Escape}');
    expect(closeKit).toHaveBeenCalledTimes(1);
    expect(closeCard).not.toHaveBeenCalled();
    rerender(ui(false));
    await user.keyboard('{Escape}');
    expect(closeCard).toHaveBeenCalledTimes(1);
    expect(closeKit).toHaveBeenCalledTimes(1);
  });
  it('keeps a blocking sheet and the read-only sheet under it open on Esc and backdrop presses', async () => {
    const closeCard = vi.fn();
    const { user } = renderUi(<>{REWARD}<Ro title="Card" onClose={closeCard} /></>);
    const [reward, card] = [dialog('Choose a reward'), dialog('Card')];
    await user.keyboard('{Escape}');
    await user.click(overlayOf(reward));
    await user.click(overlayOf(card));
    expect(closeCard).not.toHaveBeenCalled();
    expect(dialog('Choose a reward')).toBe(reward);
    expect(inert(overlayOf(card))).toBe(true);
    expect(z(overlayOf(reward))).toBeGreaterThan(z(overlayOf(card)));
    expect(reward.querySelector('[data-zone="sheet-handle"]')).toBeNull();
  });
  it('minimizes a blocking sheet to a bar above later sheets, and the bar restores it (Q59)', async () => {
    const onMinimizedChange = vi.fn();
    const ui = (cardOpen: boolean): ReactElement => <><Sheet open mode="blocking" title="Choose a reward" onMinimizedChange={onMinimizedChange}>
      <button type="button">4 lives</button></Sheet><Ro title="Card" open={cardOpen} /></>;
    const { user, rerender } = renderUi(ui(false));
    expect(focused()).toBe(button('4 lives'));
    await user.click(button(MINIMIZE_LABEL));
    expect(onMinimizedChange).toHaveBeenLastCalledWith(true);
    expect(noDialog('Choose a reward')).toBeNull();
    expect(focused()).toBe(button('Choose a reward'));
    rerender(ui(true));
    const cardOverlay = overlayOf(dialog('Card'));
    expect(z(zone(document.body, 'sheet-bar'))).toBeGreaterThan(z(cardOverlay));
    expect(inert(cardOverlay)).toBe(false);
    expect(cardOverlay.style.paddingBottom).toBe('52px');
    await user.click(button('Choose a reward'));
    expect(onMinimizedChange).toHaveBeenLastCalledWith(false);
    expect(dialog('Choose a reward').getAttribute('aria-modal')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Choose a reward' })).toBeNull();
    expect(inert(cardOverlay)).toBe(true);
    expect(focused()).toBe(button('4 lives'));
  });
  it('lets Esc close a read-only sheet opened above a minimized blocking bar', async () => {
    const closeCard = vi.fn();
    const ui = (cardOpen: boolean): ReactElement => <>{REWARD}<Ro title="Card" open={cardOpen} onClose={closeCard}><button type="button">Use</button></Ro></>;
    const { user, rerender } = renderUi(ui(false));
    await user.click(button(MINIMIZE_LABEL));
    rerender(ui(true));
    expect(focused()).toBe(button('Use'));
    await user.keyboard('{Escape}');
    expect(closeCard).toHaveBeenCalledTimes(1);
    expect(button('Choose a reward')).toBeTruthy();
  });
  it('stacks two blocking sheets with the later one on top and the earlier one inert (Lot 71 pickers)', () => {
    renderUi(<><Sheet open mode="blocking" title="Reward from Ana"><button type="button">4 lives</button></Sheet>
      <Sheet open mode="blocking" title="Reward from Ben"><button type="button">2 points</button></Sheet></>);
    const [first, second] = [overlayOf(dialog('Reward from Ana')), overlayOf(dialog('Reward from Ben'))];
    expect([inert(first), inert(second)]).toEqual([true, false]);
    expect(z(second)).toBeGreaterThan(z(first));
    expect(focused()).toBe(button('2 points'));
  });
  it('stacks read-only sheets one level: a third hides the oldest until the top one closes', async () => {
    const closeKit = vi.fn();
    const ui = (kitOpen: boolean): ReactElement => <><Ro title="Seat" /><Ro title="Card" /><Ro title="Kit" open={kitOpen} onClose={closeKit} /></>;
    const { user, rerender } = renderUi(ui(true));
    expect(noDialog('Seat')).toBeNull();
    expect(dialog('Card')).toBeTruthy();
    expect(dialog('Kit')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(closeKit).toHaveBeenCalledTimes(1);
    rerender(ui(false));
    expect(dialog('Seat')).toBeTruthy();
  });
});

describe('Sheet focus (L11-03 contract kept)', () => {
  it('moves focus in on open, wraps Tab and returns focus to the opener on close', async () => {
    const { user } = renderUi(<OpenerHarness />);
    await user.click(button('Open card'));
    const [use, sell] = [button('Use'), button('Sell')];
    expect(focused()).toBe(use);
    await user.tab();
    expect(focused()).toBe(sell);
    await user.tab();
    expect(focused()).toBe(use);
    await user.tab({ shift: true });
    expect(focused()).toBe(sell);
    await user.keyboard('{Escape}');
    expect(focused()).toBe(button('Open card'));
  });
  it('returns focus into the lower sheet when the top sheet unmounts', async () => {
    const { user } = renderUi(<StackedHarness />);
    const showKit = button('Show kit');
    expect(focused()).toBe(showKit);
    await user.click(showKit);
    expect(focused()).toBe(button('Kit info'));
    await user.keyboard('{Escape}');
    expect(noDialog('Kit')).toBeNull();
    expect(dialog('Card')).toBeTruthy();
    expect(focused()).toBe(showKit);
  });
  it('returns focus into a read-only sheet once the blocking sheet over it closes', async () => {
    const ui = (rewardOpen: boolean): ReactElement => <><Ro title="Card"><button type="button">Use</button></Ro>
      <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet></>;
    const { rerender } = renderUi(ui(false));
    expect(focused()).toBe(button('Use'));
    rerender(ui(true));
    expect(focused()).toBe(button('4 lives'));
    expect(inert(overlayOf(dialog('Card')))).toBe(true);
    rerender(ui(false));
    await waitFor(() => { expect(focused()).toBe(button('Use')); });
    expect(inert(overlayOf(dialog('Card')))).toBe(false);
  });
  it('does not pull focus back when it already left the sheet', () => {
    const ui = (open: boolean): ReactElement => <><button type="button">Open card</button><input aria-label="Message" />
      <Ro title="Card" open={open}><button type="button">Use</button></Ro></>;
    const { rerender } = renderUi(ui(false));
    act(() => { button('Open card').focus(); });
    rerender(ui(true));
    expect(focused()).toBe(button('Use'));
    const message = screen.getByRole('textbox', { name: 'Message' });
    act(() => { message.focus(); });
    rerender(ui(false));
    expect(focused()).toBe(message);
  });
});

describe('Sheet dismissal (read-only)', () => {
  it('closes on a backdrop press, never on a press inside the panel or a drag that ends on the backdrop', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Ro title="Card" onClose={onClose}><p>Deal 3 damage.</p></Ro>);
    const panel = dialog('Card');
    await user.click(screen.getByText('Deal 3 damage.'));
    await user.click(panel);
    fireEvent.pointerDown(screen.getByText('Deal 3 damage.'));
    fireEvent.click(overlayOf(panel));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(overlayOf(panel));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('keeps focus in the sheet when a backdrop press does not close it', async () => {
    const { user } = renderUi(<>{REWARD}<Sheet open mode="read-only" title="Feedback" onClose={noop} dismissLocked><button type="button">Send</button></Sheet></>);
    expect(focused()).toBe(button('4 lives'));
    await user.click(overlayOf(dialog('Choose a reward')));
    expect(focused()).toBe(button('4 lives'));
  });
  it('closes on a swipe-down of at least 80 px on the handle', () => {
    const onClose = vi.fn();
    renderUi(<Ro title="Card" onClose={onClose} />);
    swipeDown(dialog('Card'), 40);
    expect(onClose).not.toHaveBeenCalled();
    swipeDown(dialog('Card'), 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('ignores Esc, backdrop and swipe while dismissLocked (Feedback send lock, §7.7)', async () => {
    const onClose = vi.fn();
    const ui = (locked: boolean): ReactElement => <Sheet open mode="read-only" title="Feedback" onClose={onClose} dismissLocked={locked}><p>Sending</p></Sheet>;
    const { user, rerender } = renderUi(ui(true));
    await user.keyboard('{Escape}');
    await user.click(overlayOf(dialog('Feedback')));
    swipeDown(dialog('Feedback'), 120);
    expect(onClose).not.toHaveBeenCalled();
    rerender(ui(false));
    swipeDown(dialog('Feedback'), 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('leaves Esc to a child control that already handled it', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Ro title="Card" onClose={onClose}>
      <button type="button" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); } }}>Use</button></Ro>);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
  it('lets an open tooltip inside the sheet take the first Esc, and the sheet the second (Q49)', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Ro title="Card" onClose={onClose}>
      <Tooltip content="Not enough points"><button type="button">Buy</button></Tooltip></Ro>);
    await user.hover(button('Buy'));
    expect(screen.getByRole('tooltip').textContent).toBe('Not enough points');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('collapses to the caller bar without closing on Esc (targeting, §6.6.2)', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Sheet open collapsed collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={onClose}>
      <button type="button">Use</button></Sheet>);
    expect(noDialog('Basic attack')).toBeNull();
    expect(button('Cancel').closest('[data-zone="sheet-bar"]')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Sheet motion (spec v7 §8.3)', () => {
  it('fades only under reduced motion: no transform on the panel', () => {
    renderUi(<Ro title="Card" />, { reducedMotion: true });
    const panel = dialog('Card');
    expect(panel.getAttribute('data-motion')).toBe('reduced');
    expect(panel.getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
    expect(overlayOf(panel).getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
  });
  it('marks the full-motion path', () => {
    renderUi(<Ro title="Card" />);
    expect(dialog('Card').getAttribute('data-motion')).toBe('full');
  });
});
