// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Badge, BadgeGroup, type BadgeGroupItem } from './badge';

const ITEMS: readonly BadgeGroupItem[] = [
  { id: 'block', icon: 'block', label: 'Block' },
  { id: 'persistent', icon: 'persistent', label: 'Poison', value: 2, tone: 'threat-attack' },
  { id: 'spied-by-you', icon: 'spied-by-you', label: 'Spied', tone: 'mine' },
  { id: 'bot', icon: 'bot', label: 'Bot' },
];

describe('Badge (technical spec v7 §6.2)', () => {
  it('shows a decorative icon, the label and the value with its tone', () => {
    const { container } = renderUi(<Badge icon="persistent" label="Poison" value={2} tone="threat-attack" />);
    expect(screen.getByText('Poison')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(container.querySelector('[data-tone="threat-attack"]')).not.toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('labelHidden keeps the label for screen readers only', () => {
    renderUi(<Badge icon="spied-by-you" label="Spied" tone="mine" labelHidden />);
    expect(screen.getByText('Spied').classList.contains('sr-only')).toBe(true);
  });

  it('defaults to the neutral tone', () => {
    const { container } = renderUi(<Badge label="Bot" />);
    expect(container.querySelector('[data-tone="neutral"]')).not.toBeNull();
  });
});

describe('BadgeGroup (technical spec v7 §6.2)', () => {
  it('shows two badges, then "+n" for the rest', () => {
    renderUi(<BadgeGroup items={ITEMS} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Block')).toBeTruthy();
    expect(screen.getByText('Poison')).toBeTruthy();
    expect(screen.queryByText('Spied')).toBeNull();
    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('max raises the visible count', () => {
    renderUi(<BadgeGroup items={ITEMS} max={3} />);
    expect(screen.getByText('Spied')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('adds no marker when every badge fits', () => {
    renderUi(<BadgeGroup items={ITEMS.slice(0, 2)} />);
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('onOverflowClick turns "+n" into a button', async () => {
    const onOverflowClick = vi.fn();
    const { user } = renderUi(<BadgeGroup items={ITEMS} onOverflowClick={onOverflowClick} />);
    await user.click(screen.getByRole('button', { name: '+2' }));
    expect(onOverflowClick).toHaveBeenCalledTimes(1);
  });
});
