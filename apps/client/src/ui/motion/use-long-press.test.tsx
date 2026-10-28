// @vitest-environment happy-dom
/**
 * Long-press — technical spec v7 §6.6.5: about 450 ms, cancelled by more than 8 px of movement,
 * outside the hand only. It opens a read-only sheet and never sends anything.
 */
import { act, fireEvent, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { LONG_PRESS_MOVE_PX, LONG_PRESS_MS, useLongPress } from './use-long-press';

function Harness({ onLongPress, onClick, disabled }: { onLongPress: () => void; onClick: () => void; disabled?: boolean }): ReactElement {
  const handlers = useLongPress({ onLongPress, ...(disabled !== undefined ? { disabled } : {}) });
  return <button type="button" onClick={onClick} {...handlers}>Spy</button>;
}

function setup(disabled?: boolean): { onLongPress: ReturnType<typeof vi.fn>; onClick: ReturnType<typeof vi.fn>; button: HTMLElement } {
  vi.useFakeTimers();
  const onLongPress = vi.fn();
  const onClick = vi.fn();
  renderUi(<Harness onLongPress={onLongPress} onClick={onClick} {...(disabled !== undefined ? { disabled } : {})} />, {
    advanceTimers: vi.advanceTimersByTime,
  });
  return { onLongPress, onClick, button: screen.getByRole('button', { name: 'Spy' }) };
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function press(button: HTMLElement): void {
  fireEvent.pointerDown(button, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
}

describe('useLongPress (spec v7 §6.6.5)', () => {
  it('pins 450 ms and 8 px', () => {
    expect([LONG_PRESS_MS, LONG_PRESS_MOVE_PX]).toEqual([450, 8]);
  });

  it('fires once after 450 ms of a still press, not before', () => {
    const { onLongPress, button } = setup();
    press(button);
    advance(449);
    expect(onLongPress).not.toHaveBeenCalled();
    advance(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(button);
    advance(1000);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the press through 8 px of travel and cancels it past 8 px', () => {
    const { onLongPress, button } = setup();
    press(button);
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 18, clientY: 10 });
    advance(450);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(button);
    press(button);
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 10, clientY: 19 });
    advance(450);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('lets a short tap through as a click and never fires', () => {
    const { onLongPress, onClick, button } = setup();
    press(button);
    advance(200);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    advance(500);
    expect([onLongPress.mock.calls.length, onClick.mock.calls.length]).toEqual([0, 1]);
  });

  it('swallows the click that ends a long press, and only that one', () => {
    const { onLongPress, onClick, button } = setup();
    press(button);
    advance(450);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect([onLongPress.mock.calls.length, onClick.mock.calls.length]).toEqual([1, 0]);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cancels on pointercancel and ignores a secondary button', () => {
    const { onLongPress, button } = setup();
    press(button);
    fireEvent.pointerCancel(button);
    advance(450);
    fireEvent.pointerDown(button, { button: 2, pointerId: 1, clientX: 10, clientY: 10 });
    advance(450);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does nothing while disabled', () => {
    const { onLongPress, button } = setup(true);
    press(button);
    advance(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
