// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Slider, type SliderProps } from './slider';

function valueOf(element: HTMLElement): string {
  if (!(element instanceof HTMLInputElement)) throw new Error('the slider is not an <input>');
  return element.value;
}

function setup(overrides: Partial<SliderProps> = {}) {
  const onChange = vi.fn();
  const onCommit = vi.fn();
  const props: SliderProps = { label: 'Turn time', min: 5, max: 180, step: 5, value: 60, onChange, onCommit, ...overrides };
  const result = renderUi(<Slider {...props} />);
  const slider = screen.getByRole('slider', { name: 'Turn time' });
  const input = (value: number) => fireEvent.input(slider, { target: { value: String(value) } });
  return { ...result, props, slider, input, onChange, onCommit };
}

describe('Slider (technical spec v7 §7.4 — sends on release)', () => {
  it('is a labelled native range with min, max, step and value', () => {
    const { slider } = setup();
    expect(slider.getAttribute('type')).toBe('range');
    expect(['min', 'max', 'step'].map((key) => slider.getAttribute(key)).concat(valueOf(slider))).toEqual([
      '5',
      '180',
      '5',
      '60',
    ]);
  });

  it('reports live values and commits once on pointer release, never while dragging', () => {
    const { slider, input, onChange, onCommit } = setup();
    fireEvent.pointerDown(slider);
    input(90);
    input(120);
    expect(onChange.mock.calls).toEqual([[90], [120]]);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(onCommit.mock.calls).toEqual([[120]]);
  });

  it('does not commit twice when the browser fires change after the release', () => {
    const { slider, input, onCommit } = setup();
    fireEvent.pointerDown(slider);
    input(90);
    fireEvent.pointerUp(slider);
    fireEvent.change(slider);
    expect(onCommit.mock.calls).toEqual([[90]]);
  });

  it('commits once on key release, never per key step', () => {
    const { slider, input, onChange, onCommit } = setup();
    for (const value of [65, 70]) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      input(value);
      fireEvent.change(slider);
    }
    expect(onChange.mock.calls).toEqual([[65], [70]]);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(onCommit.mock.calls).toEqual([[70]]);
  });

  it('commits when focus leaves during a key press', () => {
    const { slider, input, onCommit } = setup();
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    input(65);
    fireEvent.blur(slider);
    expect(onCommit.mock.calls).toEqual([[65]]);
  });

  it('commits nothing when the release keeps the value', () => {
    const { slider, onCommit } = setup();
    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyUp(slider, { key: 'Home' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits a change that arrives outside any drag or key press', () => {
    const { slider, onCommit } = setup();
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onCommit.mock.calls).toEqual([[75]]);
  });

  it('sends a return to the prop value while an earlier commit is still unapplied', () => {
    const { slider, input, onCommit } = setup();
    fireEvent.pointerDown(slider);
    input(90);
    fireEvent.pointerUp(slider);
    fireEvent.pointerDown(slider);
    input(60);
    fireEvent.pointerUp(slider);
    expect(onCommit.mock.calls).toEqual([[90], [60]]);
  });

  it('commits again after the prop goes back to its old value (60, commit 90, prop 90, prop 60)', () => {
    const { slider, input, rerender, props, onCommit } = setup();
    fireEvent.pointerDown(slider);
    input(90);
    fireEvent.pointerUp(slider);
    rerender(<Slider {...props} value={90} />);
    rerender(<Slider {...props} value={60} />);
    fireEvent.pointerDown(slider);
    input(90);
    fireEvent.pointerUp(slider);
    expect(onCommit.mock.calls).toEqual([[90], [90]]);
  });

  it('follows a new value prop while idle', () => {
    const { slider, rerender, props, onCommit } = setup();
    rerender(<Slider {...props} value={120} />);
    expect(valueOf(slider)).toBe('120');
    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('shows formatValue output and exposes it as aria-valuetext', () => {
    const { slider } = setup({ formatValue: (value) => `${value}s` });
    expect(screen.getByText('60s')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBe('60s');
  });
});
