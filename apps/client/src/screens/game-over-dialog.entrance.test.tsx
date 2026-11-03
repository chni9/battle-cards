// @vitest-environment happy-dom
/**
 * The Game over entrance shield: a second tap of a double tap on the arena dock's Stats must not
 * land on the dialog that tap just opened (designer 2026-11-03; L74-26 gate G8; `decisions.md`).
 * For `DUR_BASE_MS` after `open` turns true, no action, overlay click or Esc reaches its handler.
 */
import { act, screen, within } from '@testing-library/react';
import { type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { DUR_BASE_MS } from '../ui/motion/motion-tokens';
import { makeFinishedView } from '../view-model/test-fixtures';
import { GameOverDialog } from './game-over-dialog';

const OPTIONS = { reducedMotion: true, advanceTimers: vi.advanceTimersByTime } as const;

function handlers() {
  return {
    onClose: vi.fn<() => void>(),
    onLeave: vi.fn<() => void>(),
    onPlayAgain: vi.fn<() => void>(),
    onOpenFeedback: vi.fn<() => void>(),
  };
}

function dialogFor(open: boolean, on: ReturnType<typeof handlers>): ReactElement {
  return <GameOverDialog open={open} view={makeFinishedView()} {...on} />;
}

const dialog = (): HTMLElement => screen.getByRole('dialog', { name: 'Game over' });
const press = (name: string): HTMLElement => within(dialog()).getByRole('button', { name });
const elapse = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
});

describe('Game over entrance shield (designer 2026-11-03, L74-26)', () => {
  it('ignores View board, Play again, Feedback and Return home pressed straight after it opens', async () => {
    const on = handlers();
    const { user } = renderUi(dialogFor(true, on), OPTIONS);
    for (const name of ['View board', 'Play again', 'Feedback', 'Return home']) {
      await user.click(press(name));
    }
    expect(on.onClose).not.toHaveBeenCalled();
    expect(on.onPlayAgain).not.toHaveBeenCalled();
    expect(on.onOpenFeedback).not.toHaveBeenCalled();
    expect(on.onLeave).not.toHaveBeenCalled();
  });

  it('ignores an overlay click and Esc pressed straight after it opens', async () => {
    const on = handlers();
    const { user } = renderUi(dialogFor(true, on), OPTIONS);
    const overlay = document.querySelector<HTMLElement>('[data-zone="dialog-overlay"]');
    if (overlay === null) throw new Error('no dialog overlay');
    await user.click(overlay);
    await user.keyboard('{Escape}');
    expect(on.onClose).not.toHaveBeenCalled();
  });

  it('ignores the DEV Download action log press straight after it opens', async () => {
    const { user } = renderUi(dialogFor(true, handlers()), OPTIONS);
    await user.click(press('Download action log'));
    expect(within(dialog()).queryByRole('button', { name: 'Building Excel…' })).toBeNull();
    expect(press('Download action log')).toBeTruthy();
  });

  it('keeps the shield for DUR_BASE_MS - 1 ms, then passes each press once', async () => {
    const on = handlers();
    const { user } = renderUi(dialogFor(true, on), OPTIONS);
    elapse(DUR_BASE_MS - 1);
    await user.click(press('View board'));
    expect(on.onClose).not.toHaveBeenCalled();

    elapse(1);
    await user.click(press('View board'));
    await user.click(press('Play again'));
    await user.click(press('Feedback'));
    await user.click(press('Return home'));
    expect(on.onClose).toHaveBeenCalledTimes(1);
    expect(on.onPlayAgain).toHaveBeenCalledTimes(1);
    expect(on.onOpenFeedback).toHaveBeenCalledTimes(1);
    expect(on.onLeave).toHaveBeenCalledTimes(1);
  });

  it('passes an overlay click and Esc once the shield is down', async () => {
    const on = handlers();
    const { user } = renderUi(dialogFor(true, on), OPTIONS);
    elapse(DUR_BASE_MS);
    const overlay = document.querySelector<HTMLElement>('[data-zone="dialog-overlay"]');
    if (overlay === null) throw new Error('no dialog overlay');
    await user.click(overlay);
    expect(on.onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(on.onClose).toHaveBeenCalledTimes(2);
  });

  it('re-arms the shield every time the dialog closes and opens again', async () => {
    const on = handlers();
    const { user, rerender } = renderUi(dialogFor(true, on), OPTIONS);
    elapse(DUR_BASE_MS);
    await user.click(press('View board'));
    expect(on.onClose).toHaveBeenCalledTimes(1);

    rerender(dialogFor(false, on));
    elapse(DUR_BASE_MS * 3);
    rerender(dialogFor(true, on));
    await user.click(press('View board'));
    expect(on.onClose).toHaveBeenCalledTimes(1);

    elapse(DUR_BASE_MS);
    await user.click(press('View board'));
    expect(on.onClose).toHaveBeenCalledTimes(2);
  });

  it('does not count time spent closed towards the shield', async () => {
    const on = handlers();
    const { user, rerender } = renderUi(dialogFor(false, on), OPTIONS);
    elapse(DUR_BASE_MS * 3);
    rerender(dialogFor(true, on));
    elapse(DUR_BASE_MS - 1);
    await user.click(press('Feedback'));
    expect(on.onOpenFeedback).not.toHaveBeenCalled();
  });
});
