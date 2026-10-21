// @vitest-environment happy-dom
import { act, screen } from '@testing-library/react';
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
