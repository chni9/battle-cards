// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { Avatar } from './avatar';

describe('Avatar (technical spec v7 §5.3, §6.2, §11)', () => {
  it('renders the image with the name as default alt', () => {
    renderUi(<Avatar name="Ada" seatIndex={2} imageUrl="data:," />);
    expect(screen.getByRole('img', { name: 'Ada' }).tagName).toBe('IMG');
  });

  it('prefers a caller alt over the name', () => {
    renderUi(<Avatar name="Ada" seatIndex={2} imageUrl="data:," alt="Warrior portrait" />);
    expect(screen.getByRole('img', { name: 'Warrior portrait' }).tagName).toBe('IMG');
  });

  it('falls back to a seat-colored disc showing the initial', () => {
    const { container } = renderUi(<Avatar name="ada" seatIndex={3} />);
    expect(screen.getByRole('img', { name: 'ada' }).tagName).not.toBe('IMG');
    expect(screen.getByText('A')).toBeTruthy();
    expect(container.querySelector('[data-seat-index="3"]')).not.toBeNull();
  });

  it('an unknown seat has no seat index', () => {
    const { container } = renderUi(<Avatar name="Zed" seatIndex={null} />);
    expect(screen.getByText('Z')).toBeTruthy();
    expect(container.querySelector('[data-seat-index]')).toBeNull();
  });

  it('eliminated: grayscale plus the eliminated icon', () => {
    const { container, rerender } = renderUi(<Avatar name="Ada" seatIndex={1} />);
    expect(container.querySelector('svg')).toBeNull();
    rerender(<Avatar name="Ada" seatIndex={1} eliminated />);
    expect(container.querySelector('.grayscale')).not.toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-eliminated="true"]')).not.toBeNull();
  });
});
