// @vitest-environment happy-dom
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { DUR_BASE_MS } from '../motion/motion-tokens';
import { MINIMIZE_LABEL } from '../ui-copy';
import { Sheet } from './sheet';
import { Tooltip } from './tooltip';

const noop = (): void => undefined;
/** A collapse or restore ignores presses for its animation window (fix round 3); wait it out. */
async function afterTransition(): Promise<void> {
  await waitFor(() => { expect(document.querySelector('[data-zone="sheet-shield"]')).toBeNull(); });
}
/** Fake-clock tests (`vi.useFakeTimers()`): move the clock inside `act`, so effects and timers flush. */
const advance = (ms: number): void => { act(() => { vi.advanceTimersByTime(ms); }); };
const shieldUp = (): boolean => document.querySelector('[data-zone="sheet-shield"]') !== null;
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
    await afterTransition();
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

function Q59Harness(): ReactElement {
  const [rewardOpen, setRewardOpen] = useState(true);
  const [cardOpen, setCardOpen] = useState(false);
  return <><button type="button" onClick={() => { setCardOpen(true); }}>Open card</button>
    <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button" onClick={() => { setRewardOpen(false); }}>Confirm</button></Sheet>
    <Ro title="Card" open={cardOpen} onClose={() => { setCardOpen(false); }}><button type="button">Use</button><button type="button">Sell</button></Ro></>;
}
function CardAndKitHarness(): ReactElement {
  const [cardOpen, setCardOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  return <><button type="button" onClick={() => { setCardOpen(true); }}>Open card</button>
    <Ro title="Card" open={cardOpen} onClose={() => { setCardOpen(false); }}><button type="button" onClick={() => { setKitOpen(true); }}>Show kit</button></Ro>
    <Ro title="Kit" open={cardOpen && kitOpen} onClose={() => { setKitOpen(false); setCardOpen(false); }}><button type="button">Kit info</button></Ro></>;
}

describe('Sheet focus follows the live sheet (fix round 1, A1)', () => {
  it('keeps focus in the card sheet after the restored reward picker is confirmed (Q59 flow)', async () => {
    const { user } = renderUi(<Q59Harness />);
    expect(focused()).toBe(button('Confirm'));
    await user.click(button(MINIMIZE_LABEL));
    await user.click(button('Open card'));
    expect(focused()).toBe(button('Use'));
    await afterTransition();
    await user.click(button('Choose a reward'));
    expect(focused()).toBe(button('Confirm'));
    expect(inert(overlayOf(dialog('Card')))).toBe(true);
    await user.click(button('Confirm'));
    expect(focused()).toBe(button('Use'));
    await user.tab();
    expect(focused()).toBe(button('Sell'));
    await user.tab();
    expect(focused()).toBe(button('Use'));
  });
  it('moves focus into a read-only sheet that opened under a blocking sheet once that sheet closes', () => {
    const ui = (rewardOpen: boolean): ReactElement => <>
      <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet>
      <Ro title="Card"><button type="button">Use</button></Ro></>;
    const { rerender } = renderUi(ui(true));
    expect(focused()).toBe(button('4 lives'));
    expect(inert(overlayOf(dialog('Card')))).toBe(true);
    rerender(ui(false));
    expect(focused()).toBe(button('Use'));
  });
  it('moves focus into that read-only sheet, not the bar, when the blocking sheet minimizes', async () => {
    const { user } = renderUi(<>{REWARD}<Ro title="Card"><button type="button">Use</button></Ro></>);
    await user.click(button(MINIMIZE_LABEL));
    expect(focused()).toBe(button('Use'));
    expect(inert(overlayOf(dialog('Card')))).toBe(false);
  });
  it('returns focus to the opener when a minimized sheet closes while its bar holds focus', async () => {
    const ui = (open: boolean): ReactElement => <><button type="button">Draw</button>
      <Sheet open={open} mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet></>;
    const { user, rerender } = renderUi(ui(false));
    act(() => { button('Draw').focus(); });
    rerender(ui(true));
    await user.click(button(MINIMIZE_LABEL));
    expect(focused()).toBe(button('Choose a reward'));
    rerender(ui(false));
    expect(focused()).toBe(button('Draw'));
  });
  it('returns focus to the page opener when one update closes two stacked sheets', async () => {
    const { user } = renderUi(<CardAndKitHarness />);
    await user.click(button('Open card'));
    await user.click(button('Show kit'));
    expect(focused()).toBe(button('Kit info'));
    await user.keyboard('{Escape}');
    expect(focused()).toBe(button('Open card'));
  });
  it('forgets the opener when a sheet closes, so a later cycle never reuses it', () => {
    const ui = (open: boolean): ReactElement => <><button type="button">Open card</button>
      <Ro title="Card" open={open}><button type="button">Use</button></Ro></>;
    const { rerender } = renderUi(ui(false));
    act(() => { button('Open card').focus(); });
    rerender(ui(true));
    rerender(ui(false));
    expect(focused()).toBe(button('Open card'));
    act(() => { button('Open card').blur(); });
    rerender(ui(true));
    expect(focused()).toBe(button('Use'));
    rerender(ui(false));
    expect(focused()).toBe(document.body);
  });
  it('makes a read-only sheet under another expanded sheet inert (A5, WAI-ARIA modal dialog)', () => {
    renderUi(<><Ro title="Card"><button type="button">Use</button></Ro><Ro title="Kit"><button type="button">Info</button></Ro></>);
    expect([inert(overlayOf(dialog('Card'))), inert(overlayOf(dialog('Kit')))]).toEqual([true, false]);
    expect(focused()).toBe(button('Info'));
  });
});

function ClosingSheet({ title, onClose }: { title: string; onClose: () => void }): ReactElement {
  const [open, setOpen] = useState(true);
  return <Ro title={title} open={open} onClose={() => { onClose(); setOpen(false); }} />;
}
function ClosingCardAndKit({ closeCard, closeKit }: { closeCard: () => void; closeKit: () => void }): ReactElement {
  const [cardOpen, setCardOpen] = useState(true);
  const [kitOpen, setKitOpen] = useState(true);
  return <><Ro title="Card" open={cardOpen} onClose={() => { closeCard(); setCardOpen(false); }} />
    <Ro title="Kit" open={kitOpen} onClose={() => { closeKit(); setKitOpen(false); }} /></>;
}
const clickThrough = (element: HTMLElement): void => { fireEvent.pointerDown(element); fireEvent.pointerUp(element); fireEvent.click(element); };

describe('Sheet exit guard (fix round 1, A3)', () => {
  it('absorbs a backdrop press during the top sheet exit, and the lower sheet takes the next one (P9e, fix round 2)', async () => {
    const [closeCard, closeKit] = [vi.fn(), vi.fn()];
    const { user } = renderUi(<ClosingCardAndKit closeCard={closeCard} closeKit={closeKit} />);
    const kitPanel = dialog('Kit');
    const kitOverlay = overlayOf(kitPanel);
    await user.keyboard('{Escape}');
    expect(kitOverlay.isConnected).toBe(true);
    expect([kitOverlay.style.pointerEvents, inert(kitOverlay), kitOverlay.getAttribute('aria-hidden'), inert(kitPanel)])
      .toEqual(['', false, 'true', true]);
    await user.click(kitOverlay);
    expect([closeKit.mock.calls.length, closeCard.mock.calls.length]).toEqual([1, 0]);
    await waitFor(() => { expect(kitOverlay.isConnected).toBe(false); });
    await user.click(overlayOf(dialog('Card')));
    expect(closeCard).toHaveBeenCalledTimes(1);
  });
  it('closes only the top sheet on a double-click on its backdrop (fix round 2)', async () => {
    const [closeCard, closeKit] = [vi.fn(), vi.fn()];
    const { user } = renderUi(<ClosingCardAndKit closeCard={closeCard} closeKit={closeKit} />);
    await user.dblClick(overlayOf(dialog('Kit')));
    expect([closeKit.mock.calls.length, closeCard.mock.calls.length]).toEqual([1, 0]);
  });
  it('ignores a second swipe on the exiting handle (P12c)', () => {
    const onClose = vi.fn();
    renderUi(<ClosingSheet title="Card" onClose={onClose} />);
    const panel = dialog('Card');
    swipeDown(panel, 120);
    swipeDown(panel, 120);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(zone(panel, 'sheet-handle').isConnected).toBe(true);
  });
});

describe('Sheet fix round 1: stack order and minors', () => {
  it('keeps a collapsed targeting bar under an expanded blocking sheet, inert (A4, §6.7)', () => {
    renderUi(<><Sheet open collapsed collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={noop}>
      <button type="button">Use</button></Sheet>{REWARD}</>);
    const bar = zone(document.body, 'sheet-bar');
    expect(z(bar)).toBeLessThan(z(overlayOf(dialog('Choose a reward'))));
    expect(inert(bar)).toBe(true);
    expect(focused()).toBe(button('4 lives'));
  });
  it('does not close on a press that starts on the backdrop and ends inside the panel (B1)', () => {
    const onClose = vi.fn();
    renderUi(<Ro title="Card" onClose={onClose}><p>Deal 3 damage.</p></Ro>);
    const overlay = overlayOf(dialog('Card'));
    fireEvent.pointerDown(overlay);
    fireEvent.pointerUp(screen.getByText('Deal 3 damage.'));
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
    clickThrough(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('leaves Esc unhandled for the caller while a collapsed targeting sheet is the newest (B2, §6.6.5)', async () => {
    const [closeSeat, closeCard] = [vi.fn(), vi.fn()];
    const { user } = renderUi(<><Ro title="Seat" onClose={closeSeat} />
      <Sheet open collapsed collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={closeCard}>
        <button type="button">Use</button></Sheet></>);
    const seen: boolean[] = [];
    const onKeyDown = (event: KeyboardEvent): void => { seen.push(event.defaultPrevented); };
    document.addEventListener('keydown', onKeyDown);
    try {
      await user.keyboard('{Escape}');
    } finally {
      document.removeEventListener('keydown', onKeyDown);
    }
    expect([closeSeat.mock.calls.length, closeCard.mock.calls.length]).toEqual([0, 0]);
    expect(seen).toEqual([false]);
  });
  it('lets presses through the bar strip and marks the restore control collapsed (B3, B5)', async () => {
    const { user } = renderUi(REWARD);
    await user.click(button(MINIMIZE_LABEL));
    const bar = zone(document.body, 'sheet-bar');
    const restore = button('Choose a reward');
    expect(bar.style.pointerEvents).toBe('none');
    const strip = bar.firstElementChild;
    expect(strip instanceof HTMLElement ? strip.style.pointerEvents : null).toBe('auto');
    expect(restore.getAttribute('aria-expanded')).toBe('false');
    expect(restore.querySelector('svg[data-icon="chevron-right"]')).not.toBeNull();
  });
});

function TargetingHarness(): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  return <Sheet open collapsed={collapsed} collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={noop}>
    <button type="button" onClick={() => { setCollapsed(true); }}>Use</button></Sheet>;
}

describe('Sheet collapse shield (fix round 2, §1, §6.6.4)', () => {
  it('covers the box, bar included, with a no-op shield for the panel exit time while the bar shows at once', async () => {
    const onPagePress = vi.fn();
    const { user } = renderUi(<><button type="button" onClick={onPagePress}>Draw</button><TargetingHarness /></>);
    await user.click(button('Use'));
    const shield = zone(document.body, 'sheet-shield');
    const bar = zone(document.body, 'sheet-bar');
    expect(button('Cancel').closest('[data-zone="sheet-bar"]')).toBe(bar);
    // happy-dom has no hit testing: a press anywhere in the box, the bar's Cancel included,
    // reaches the shield, a fixed, hit-testable layer over the whole box that paints above the
    // bar (same layer, later in the DOM; fix round 3).
    expect([shield.style.position, shield.style.pointerEvents, shield.getAttribute('aria-hidden')]).toEqual(['fixed', '', 'true']);
    expect(z(shield)).toBe(z(bar));
    expect(bar.compareDocumentPosition(shield) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(shield);
    expect(onPagePress).not.toHaveBeenCalled();
    await waitFor(() => { expect(document.querySelector('[data-zone="sheet-shield"]')).toBeNull(); });
  });
  it('drops the shield under reduced motion, where the panel does not animate out', async () => {
    const { user } = renderUi(<TargetingHarness />, { reducedMotion: true });
    await user.click(button('Use'));
    expect(document.querySelector('[data-zone="sheet-shield"]')).toBeNull();
    expect(button('Cancel')).toBeTruthy();
  });
});

describe('Sheet shield timer (fix round 4)', () => {
  const collapsibleUi = (collapsed: boolean): ReactElement => <Sheet open collapsed={collapsed} collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={noop}>
    <button type="button">Use</button></Sheet>;
  it('restarts a full shield window on every real transition, not from the first one', () => {
    vi.useFakeTimers();
    const { rerender } = renderUi(collapsibleUi(false), { advanceTimers: vi.advanceTimersByTime });
    rerender(collapsibleUi(true));
    expect(shieldUp()).toBe(true);
    advance(100);
    rerender(collapsibleUi(false));
    advance(DUR_BASE_MS - 1);
    expect(shieldUp()).toBe(true);
    advance(2);
    expect(shieldUp()).toBe(false);
  });
  it('raises no shield for either transition under reduced motion', () => {
    vi.useFakeTimers();
    const { rerender } = renderUi(collapsibleUi(false), { reducedMotion: true, advanceTimers: vi.advanceTimersByTime });
    rerender(collapsibleUi(true));
    expect(shieldUp()).toBe(false);
    advance(100);
    rerender(collapsibleUi(false));
    expect(shieldUp()).toBe(false);
  });
});

describe('Sheet opener chain (fix round 2)', () => {
  it('re-parents an opener when the sheet that held it closes first (a: Card closes under Kit)', () => {
    const ui = (cardOpen: boolean, kitOpen: boolean): ReactElement => <><button type="button">Open card</button>
      <Ro title="Card" open={cardOpen}><button type="button">Show kit</button></Ro>
      <Ro title="Kit" open={kitOpen}><button type="button">Kit info</button></Ro></>;
    const { rerender } = renderUi(ui(false, false));
    act(() => { button('Open card').focus(); });
    rerender(ui(true, false));
    expect(focused()).toBe(button('Show kit'));
    rerender(ui(true, true));
    expect(focused()).toBe(button('Kit info'));
    rerender(ui(false, true));
    expect(focused()).toBe(button('Kit info'));
    rerender(ui(false, false));
    expect(focused()).toBe(button('Open card'));
  });
  it('re-parents a blocking sheet opener when the card it came from closes underneath (b)', () => {
    const ui = (cardOpen: boolean, rewardOpen: boolean): ReactElement => <><button type="button">Open card</button>
      <Ro title="Card" open={cardOpen}><button type="button">Use</button></Ro>
      <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button">Confirm</button></Sheet></>;
    const { rerender } = renderUi(ui(false, false));
    act(() => { button('Open card').focus(); });
    rerender(ui(true, false));
    rerender(ui(true, true));
    expect(focused()).toBe(button('Confirm'));
    rerender(ui(false, true));
    rerender(ui(false, false));
    expect(focused()).toBe(button('Open card'));
  });
  it('re-parents the opener of a sheet that mounted under a blocking sheet (c)', () => {
    const ui = (rewardOpen: boolean, cardOpen: boolean): ReactElement => <><button type="button">Draw</button>
      <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet>
      <Ro title="Card" open={cardOpen}><button type="button">Use</button></Ro></>;
    const { rerender } = renderUi(ui(false, false));
    act(() => { button('Draw').focus(); });
    rerender(ui(true, false));
    rerender(ui(true, true));
    expect(focused()).toBe(button('4 lives'));
    rerender(ui(false, true));
    expect(focused()).toBe(button('Use'));
    rerender(ui(false, false));
    expect(focused()).toBe(button('Draw'));
  });
  it('re-parents openers even when the closing sheet leaves focus where it is (c, early return)', async () => {
    const ui = (rewardOpen: boolean, cardOpen: boolean): ReactElement => <><button type="button">Draw</button>
      <Sheet open mode="blocking" title="Steal a card"><button type="button">Take</button></Sheet>
      <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet>
      <Ro title="Card" open={cardOpen}><button type="button">Use</button></Ro></>;
    const { user, rerender } = renderUi(ui(false, false));
    await user.click(button(MINIMIZE_LABEL));
    act(() => { button('Draw').focus(); });
    rerender(ui(true, false));
    rerender(ui(true, true));
    expect(focused()).toBe(button('4 lives'));
    // Focus sits on an uncovered bar, a reachable place, so the reward's close returns early.
    act(() => { button('Steal a card').focus(); });
    rerender(ui(false, true));
    expect(focused()).toBe(button('Use'));
    rerender(ui(false, false));
    expect(focused()).toBe(button('Draw'));
  });
  it('reaches a minimized sheet through its bar when the chain leads into it', async () => {
    const ui = (cardOpen: boolean): ReactElement => <>{REWARD}<Ro title="Card" open={cardOpen}><button type="button">Use</button></Ro></>;
    const { user, rerender } = renderUi(ui(false));
    rerender(ui(true));
    await user.click(button(MINIMIZE_LABEL));
    expect(focused()).toBe(button('Use'));
    rerender(ui(false));
    expect(focused()).toBe(button('Choose a reward'));
  });
  it('puts focus back where it was in the sheet that becomes live on Minimize (Chat message field)', async () => {
    const ui = (rewardOpen: boolean): ReactElement => <>
      <Ro title="Chat"><button type="button">Emoji</button><input aria-label="Message" /></Ro>
      <Sheet open={rewardOpen} mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet></>;
    const { user, rerender } = renderUi(ui(false));
    const message = screen.getByRole('textbox', { name: 'Message' });
    act(() => { message.focus(); });
    rerender(ui(true));
    expect(focused()).toBe(button('4 lives'));
    await user.click(button(MINIMIZE_LABEL));
    expect(focused()).toBe(message);
    await afterTransition();
    await user.click(button('Choose a reward'));
    expect(focused()).toBe(button('4 lives'));
    rerender(ui(false));
    expect(focused()).toBe(message);
  });
});

describe('Sheet press shields, scoped (fix round 3)', () => {
  it('keeps a covered sheet that closes click-through and under the live sheet during its exit (1)', async () => {
    const onConfirm = vi.fn();
    const ui = (cardOpen: boolean): ReactElement => <>
      <Sheet open mode="blocking" title="Choose a reward"><button type="button" onClick={onConfirm}>Confirm</button></Sheet>
      <Ro title="Card" open={cardOpen}><button type="button">Use</button></Ro></>;
    const { user, rerender } = renderUi(ui(true));
    const cardOverlay = overlayOf(dialog('Card'));
    rerender(ui(false));
    const rewardOverlay = overlayOf(dialog('Choose a reward'));
    expect(cardOverlay.isConnected).toBe(true);
    expect([cardOverlay.style.pointerEvents, inert(cardOverlay)]).toEqual(['none', true]);
    expect(z(cardOverlay)).toBeLessThan(z(rewardOverlay));
    await user.click(button('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
  it('raises no shield for a sheet that mounts already collapsed (2)', () => {
    renderUi(<Sheet open collapsed collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={noop}>
      <button type="button">Use</button></Sheet>);
    expect(button('Cancel')).toBeTruthy();
    expect(document.querySelector('[data-zone="sheet-shield"]')).toBeNull();
  });
  it('ignores the restore bar during the Minimize window, then restores (3: double tap on Minimize)', async () => {
    vi.useFakeTimers();
    const onMinimizedChange = vi.fn();
    const { user } = renderUi(<Sheet open mode="blocking" title="Choose a reward" onMinimizedChange={onMinimizedChange}>
      <button type="button">4 lives</button></Sheet>, { advanceTimers: vi.advanceTimersByTime });
    await user.click(button(MINIMIZE_LABEL));
    await user.click(button('Choose a reward'));
    expect(noDialog('Choose a reward')).toBeNull();
    expect(onMinimizedChange.mock.calls).toEqual([[true]]);
    advance(DUR_BASE_MS - 1);
    await user.click(button('Choose a reward'));
    expect(noDialog('Choose a reward')).toBeNull();
    expect(onMinimizedChange.mock.calls).toEqual([[true]]);
    advance(2);
    await user.click(button('Choose a reward'));
    expect(dialog('Choose a reward')).toBeTruthy();
    expect(onMinimizedChange.mock.calls).toEqual([[true], [false]]);
  });
  it('ignores Minimize during the restore window, then minimizes (3: double tap on the restore bar)', async () => {
    vi.useFakeTimers();
    const { user } = renderUi(REWARD, { advanceTimers: vi.advanceTimersByTime });
    await user.click(button(MINIMIZE_LABEL));
    advance(DUR_BASE_MS + 1);
    await user.click(button('Choose a reward'));
    expect(shieldUp()).toBe(true);
    await user.click(button(MINIMIZE_LABEL));
    expect(dialog('Choose a reward')).toBeTruthy();
    advance(DUR_BASE_MS - 1);
    await user.click(button(MINIMIZE_LABEL));
    expect(dialog('Choose a reward')).toBeTruthy();
    advance(2);
    await user.click(button(MINIMIZE_LABEL));
    expect(noDialog('Choose a reward')).toBeNull();
  });
});
