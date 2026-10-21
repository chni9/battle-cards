// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Tooltip } from './tooltip';

function describedByIds(element: Element): string[] {
  return (element.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id !== '');
}

function BuyWithTooltip({ describedBy, placement }: { describedBy?: string; placement?: 'top' | 'bottom' }) {
  return (
    <>
      <Tooltip content="Not enough points" {...(placement !== undefined ? { placement } : {})}>
        <button type="button" {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}>
          Buy
        </button>
      </Tooltip>
      <button type="button">Other</button>
    </>
  );
}

describe('Tooltip (parity global-tooltip-unused)', () => {
  it('describes its trigger even while the bubble is closed', () => {
    renderUi(<BuyWithTooltip />);
    expect(screen.queryByRole('tooltip')).toBeNull();
    const [id] = describedByIds(screen.getByRole('button', { name: 'Buy' }));
    expect(document.getElementById(id ?? '')?.textContent).toBe('Not enough points');
  });

  it('opens on focus and closes on blur', async () => {
    const { user } = renderUi(<BuyWithTooltip />);
    await user.tab();
    expect(screen.getByRole('tooltip').textContent).toBe('Not enough points');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Other' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens on hover and closes when the pointer leaves', async () => {
    const { user } = renderUi(<BuyWithTooltip />);
    await user.hover(screen.getByRole('button', { name: 'Buy' }));
    expect(screen.getByRole('tooltip')).toBeTruthy();
    await user.unhover(screen.getByRole('button', { name: 'Buy' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('Esc closes it, and that press reaches nothing underneath (Q49)', async () => {
    const onKeyDown = vi.fn();
    const { user } = renderUi(
      <div onKeyDown={onKeyDown}>
        <BuyWithTooltip />
      </div>,
    );
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(onKeyDown).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('keeps an aria-describedby the trigger already has', () => {
    renderUi(<BuyWithTooltip describedBy="buy-help" />);
    const ids = describedByIds(screen.getByRole('button', { name: 'Buy' }));
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe('buy-help');
  });

  it('places the bubble below on request', async () => {
    const { user } = renderUi(<BuyWithTooltip placement="bottom" />);
    await user.tab();
    expect(screen.getByRole('tooltip').getAttribute('data-placement')).toBe('bottom');
  });
});
