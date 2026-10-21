// @vitest-environment happy-dom
import { act, fireEvent, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Z_INDEX } from '../layers';
import { Toast } from './toast';

const timers = { advanceTimers: vi.advanceTimersByTime };
const tick = (ms: number): void => { act(() => { vi.advanceTimersByTime(ms); }); };
const base = { title: "Can't do that", tone: 'error', timeoutMs: 4000, dismissLabel: 'OK' } as const;
const ok = (): HTMLElement => screen.getByRole('button', { name: 'OK' });

describe('Toast dismissal (spec v7 §6.12)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls onDismiss once with manual, and the timeout never fires after it', async () => {
    const onDismiss = vi.fn();
    const { user } = renderUi(<Toast open {...base} body="It is not your turn." onDismiss={onDismiss} />, timers);
    expect(screen.getByRole('alert').textContent).toContain("Can't do that");
    await user.click(ok());
    await user.click(ok());
    tick(10_000);
    expect(onDismiss.mock.calls).toEqual([['manual']]);
  });
  it('calls onDismiss once with timeout, and the close button cannot fire it again', async () => {
    const onDismiss = vi.fn();
    const { user } = renderUi(<Toast open {...base} onDismiss={onDismiss} />, timers);
    tick(3999);
    expect(onDismiss).not.toHaveBeenCalled();
    tick(1);
    expect(onDismiss.mock.calls).toEqual([['timeout']]);
    await user.click(ok());
    tick(10_000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  it('keeps one timer across rerenders and never dismisses on a prop update', () => {
    const [first, second] = [vi.fn(), vi.fn()];
    const { rerender } = renderUi(<Toast open {...base} body="It is not your turn." onDismiss={first} />, timers);
    tick(3000);
    const next = (): ReactElement => <Toast open title="Not enough points" body="You need 2 points." tone="info" timeoutMs={8000} dismissLabel="OK" onDismiss={second} />;
    rerender(next());
    rerender(next());
    tick(999);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    tick(1);
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([['timeout']]);
  });
  it('starts a fresh dismissal cycle each time open turns true', () => {
    const onDismiss = vi.fn();
    const { rerender } = renderUi(<Toast open {...base} onDismiss={onDismiss} />, timers);
    tick(4000);
    rerender(<Toast open={false} {...base} onDismiss={onDismiss} />);
    rerender(<Toast open {...base} onDismiss={onDismiss} />);
    tick(4000);
    expect(onDismiss.mock.calls).toEqual([['timeout'], ['timeout']]);
  });
  it('uses status for non-errors, sits on the toast layer and fades without a transform under reduced motion', () => {
    renderUi(<Toast open title="Link copied" dismissLabel="OK" onDismiss={() => undefined} />, { reducedMotion: true, ...timers });
    const toast = screen.getByRole('status');
    expect(Number(toast.style.zIndex)).toBe(Z_INDEX.toast);
    expect(toast.getAttribute('data-motion')).toBe('reduced');
    expect(toast.getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
  });
});

describe('Toast fix round 1', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('never dismisses from the OK button of a toast that is closing (A3, P8d)', () => {
    const onDismiss = vi.fn();
    const { rerender } = renderUi(<Toast open {...base} onDismiss={onDismiss} />, timers);
    const button = ok();
    rerender(<Toast open={false} {...base} onDismiss={onDismiss} />);
    expect(button.isConnected).toBe(true);
    fireEvent.click(button);
    expect(onDismiss).not.toHaveBeenCalled();
    const card = button.closest<HTMLElement>('[data-zone="toast"]');
    expect([card?.style.pointerEvents, card?.hasAttribute('inert')]).toEqual(['none', true]);
  });
  it('keeps both live regions mounted, empty while closed, and swaps only their content (B4)', () => {
    const props = { title: 'Link copied', dismissLabel: 'OK', onDismiss: () => undefined } as const;
    const { rerender } = renderUi(<Toast open={false} {...props} />, timers);
    const [status, alert] = [screen.getByRole('status'), screen.getByRole('alert')];
    expect([status.textContent, alert.textContent]).toEqual(['', '']);
    rerender(<Toast open {...props} />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toContain('Link copied');
    expect(alert.textContent).toBe('');
    rerender(<Toast open={false} {...props} />);
    rerender(<Toast open {...props} tone="error" title="Can't do that" />);
    expect(screen.getByRole('alert')).toBe(alert);
    expect(alert.textContent).toContain("Can't do that");
  });
  it('fades the card without a transform under reduced motion', () => {
    renderUi(<Toast open title="Link copied" dismissLabel="OK" onDismiss={() => undefined} />, { reducedMotion: true, ...timers });
    const card = screen.getByRole('status').querySelector<HTMLElement>('[data-zone="toast"]');
    expect(card?.getAttribute('data-motion')).toBe('reduced');
    expect(card?.getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
  });
});
