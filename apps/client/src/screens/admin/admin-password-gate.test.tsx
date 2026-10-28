// @vitest-environment happy-dom
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INBOX_PASSWORD_STORAGE_KEY } from '../../inbox/password-storage';
import { renderUi } from '../../test/render';
import { AdminPasswordGate } from './admin-password-gate';

interface ProbeResult {
  ok: boolean;
  status: number;
}

afterEach(() => {
  sessionStorage.clear();
});

/** A probe whose answers the test gives, each inside `act` with the gate's chain drained. */
function controlledProbe() {
  const pending: { resolve: (result: ProbeResult) => void; reject: (reason: Error) => void }[] = [];
  const probe = vi.fn<(password: string) => Promise<ProbeResult>>(
    () =>
      new Promise<ProbeResult>((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  const settle = async (answer: (call: (typeof pending)[number]) => void): Promise<void> => {
    const call = pending.at(-1);
    if (call === undefined) throw new Error('The gate has not probed yet');
    await act(async () => {
      answer(call);
      // then → catch → finally in the gate: a few turns, with headroom.
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
    });
  };
  return {
    probe,
    answer: (result: ProbeResult) =>
      settle((call) => {
        call.resolve(result);
      }),
    fail: () =>
      settle((call) => {
        call.reject(new TypeError('Failed to fetch'));
      }),
  };
}

function unlockButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Unlock' });
}

/** Unlock is `focusableWhenDisabled`: its off state is `aria-disabled`, never native `disabled`. */
function isOff(button: HTMLElement): boolean {
  expect(button.hasAttribute('disabled')).toBe(false);
  return button.getAttribute('aria-disabled') === 'true';
}

describe('AdminPasswordGate (L61-06, L80-01)', () => {
  it('Enter in Password submits once, stores the key and unlocks', async () => {
    const { probe, answer } = controlledProbe();
    const onUnlocked = vi.fn();
    const { user } = renderUi(<AdminPasswordGate onUnlocked={onUnlocked} probe={probe} />);
    await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
    expect(probe.mock.calls).toStrictEqual([['secret']]);
    expect(onUnlocked).not.toHaveBeenCalled();
    await answer({ ok: true, status: 200 });
    expect(onUnlocked.mock.calls).toStrictEqual([['secret']]);
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('secret');
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('Unlock is disabled while blank and reads Checking… while busy', async () => {
    const { probe, fail } = controlledProbe();
    const { user } = renderUi(<AdminPasswordGate onUnlocked={vi.fn()} probe={probe} />);
    const field = screen.getByLabelText('Password');
    expect(isOff(unlockButton())).toBe(true);
    await user.type(field, '   {Enter}');
    expect(isOff(unlockButton())).toBe(true);
    await user.click(unlockButton());
    expect(probe).not.toHaveBeenCalled();
    await user.clear(field);
    await user.type(field, 'secret');
    expect(isOff(unlockButton())).toBe(false);
    await user.click(unlockButton());
    expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();
    const checking = screen.getByRole('button', { name: 'Checking…' });
    expect(isOff(checking)).toBe(true);
    // The press that started the check keeps focus on the button rather than dropping it.
    expect(document.activeElement).toBe(checking);
    await user.click(checking);
    await user.type(field, '{Enter}');
    expect(probe).toHaveBeenCalledTimes(1);
    await fail();
    expect(isOff(unlockButton())).toBe(false);
  });

  it('a network failure shows Could not load and re-enables Unlock', async () => {
    const { probe, fail } = controlledProbe();
    const onUnlocked = vi.fn();
    const { user } = renderUi(<AdminPasswordGate onUnlocked={onUnlocked} probe={probe} />);
    await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
    await fail();
    expect(screen.getByRole('alert').textContent).toBe('Could not load');
    expect(isOff(unlockButton())).toBe(false);
    expect(onUnlocked).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
  });

  it('a 401 shows Wrong password and clears the stored key', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'old');
    const { probe, answer } = controlledProbe();
    const { user } = renderUi(<AdminPasswordGate onUnlocked={vi.fn()} probe={probe} />);
    await user.click(unlockButton());
    expect(probe.mock.calls).toStrictEqual([['old']]);
    await answer({ ok: false, status: 401 });
    expect(screen.getByRole('alert').textContent).toBe('Wrong password');
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
  });

  it('a 429 on Unlock shows the rate-limit copy and keeps the gate', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'old');
    const { probe, answer } = controlledProbe();
    const onUnlocked = vi.fn();
    const { user } = renderUi(<AdminPasswordGate onUnlocked={onUnlocked} probe={probe} />);
    await user.click(unlockButton());
    expect(probe.mock.calls).toStrictEqual([['old']]);
    await answer({ ok: false, status: 429 });
    expect(screen.getByRole('alert').textContent).toBe(
      'Too many wrong passwords. Try again in a few minutes.',
    );
    expect(onUnlocked).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Password')).not.toBeNull();
    expect(isOff(unlockButton())).toBe(false);
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('old');
  });

  it('the password field uses the 16 px input step', () => {
    renderUi(<AdminPasswordGate onUnlocked={vi.fn()} probe={controlledProbe().probe} />);
    const field = screen.getByLabelText('Password');
    expect(field.getAttribute('type')).toBe('password');
    expect(field.getAttribute('autocomplete')).toBe('current-password');
    expect(field.classList.contains('text-v7-input')).toBe(true);
  });
});
