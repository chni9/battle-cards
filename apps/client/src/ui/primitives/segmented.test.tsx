// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Segmented, type SegmentedOption } from './segmented';

type Difficulty = 'easy' | 'normal' | 'hard';

function options(hardDisabled = false): readonly SegmentedOption<Difficulty>[] {
  return [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard', ...(hardDisabled ? { disabled: true } : {}) },
  ];
}

function Harness({
  onChange,
  hardDisabled = false,
  disabled = false,
}: {
  onChange: (value: Difficulty) => void;
  hardDisabled?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<Difficulty>('normal');
  return (
    <Segmented
      label="Difficulty"
      options={options(hardDisabled)}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

const radio = (name: string) => screen.getByRole('radio', { name });

describe('Segmented (technical spec v7 §11, WAI-ARIA radio group)', () => {
  it('is a labelled radiogroup with aria-checked radios and a roving tabindex', () => {
    renderUi(<Harness onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Difficulty' })).toBeTruthy();
    expect(radio('Normal').getAttribute('aria-checked')).toBe('true');
    expect(radio('Easy').getAttribute('aria-checked')).toBe('false');
    expect(radio('Normal').tabIndex).toBe(0);
    expect(radio('Hard').tabIndex).toBe(-1);
  });

  it('click selects an option', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<Harness onChange={onChange} />);
    await user.click(radio('Hard'));
    expect(onChange.mock.calls).toEqual([['hard']]);
    expect(radio('Hard').getAttribute('aria-checked')).toBe('true');
  });

  it('arrow keys on both axes move focus and select, wrapping', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<Harness onChange={onChange} />);
    await user.tab();
    expect(document.activeElement).toBe(radio('Normal'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(radio('Hard'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(radio('Easy'));
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(radio('Normal'));
    expect(onChange.mock.calls).toEqual([['hard'], ['easy'], ['hard'], ['normal']]);
  });

  it('moves the roving tabindex with the selection', async () => {
    const { user } = renderUi(<Harness onChange={vi.fn()} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(radio('Hard').tabIndex).toBe(0);
    expect(radio('Normal').tabIndex).toBe(-1);
  });

  it('leaves browser shortcuts alone: Ctrl+ArrowRight changes nothing', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<Harness onChange={onChange} />);
    await user.tab();
    expect(fireEvent.keyDown(radio('Normal'), { key: 'ArrowRight', ctrlKey: true })).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(radio('Normal'));
  });

  it('skips a disabled option', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<Harness onChange={onChange} hardDisabled />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange.mock.calls).toEqual([['easy']]);
  });

  it('a disabled group blocks every option', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<Harness onChange={onChange} disabled />);
    expect(screen.getByRole('radiogroup', { name: 'Difficulty' }).getAttribute('aria-disabled')).toBe('true');
    await user.click(radio('Easy'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('passes numeric values through unchanged', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(
      <Segmented
        label="Seats"
        options={[
          { value: 2, label: '2 seats' },
          { value: 3, label: '3 seats' },
        ]}
        value={2}
        onChange={onChange}
      />,
    );
    await user.click(radio('3 seats'));
    expect(onChange.mock.calls).toEqual([[3]]);
  });
});
