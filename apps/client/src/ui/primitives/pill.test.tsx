// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { Pill } from './pill';

describe('Pill (L43-01, L51-08)', () => {
  it('shows icon and value and reads "{label} {value}"', () => {
    const { container } = renderUi(<Pill icon="life" label="Lives" value={12} resourceKind="life" />);
    expect(screen.getByText('12').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Lives 12').classList.contains('sr-only')).toBe(true);
    const root = container.querySelector('[data-resource-kind="life"]');
    expect(root?.getAttribute('title')).toBe('Lives');
    expect(root?.getAttribute('data-tone')).toBe('life');
    expect(root?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a hidden value renders "?" and reads "{label} unknown"', () => {
    const { container } = renderUi(<Pill icon="point" label="Points" value="unknown" resourceKind="point" />);
    expect(screen.getByText('?')).toBeTruthy();
    expect(screen.getByText('Points unknown').classList.contains('sr-only')).toBe(true);
    expect(container.querySelector('[data-resource-kind="point"]')?.getAttribute('title')).toBe('Points unknown');
  });

  it('captionVisible shows the caption word; otherwise it is screen-reader only', () => {
    const { rerender } = renderUi(<Pill icon="shield" label="Shield" value={2} resourceKind="shield" captionVisible />);
    expect(screen.getByText('Shield').getAttribute('aria-hidden')).toBe('true');
    rerender(<Pill icon="shield" label="Shield" value={2} resourceKind="shield" />);
    expect(screen.queryByText('Shield')).toBeNull();
    expect(screen.getByText('Shield 2')).toBeTruthy();
  });

  it('size lg puts the value on the vital step (own lives >= 20 px, §5.2)', () => {
    const { container } = renderUi(<Pill icon="life" label="Lives" value={20} resourceKind="life" size="lg" />);
    expect(screen.getByText('20').classList.contains('text-v7-vital')).toBe(true);
    expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
  });

  it('tone follows resourceKind, can be overridden, and is neutral without a kind', () => {
    const toneOf = (container: HTMLElement) => container.firstElementChild?.getAttribute('data-tone');
    const { container, rerender } = renderUi(
      <Pill icon="upgrade" label="Upgrade points" value={1} resourceKind="upgradePoint" />,
    );
    expect(toneOf(container)).toBe('upgrade');
    rerender(<Pill icon="life" label="Lives" value={4} resourceKind="life" tone="neutral" />);
    expect(toneOf(container)).toBe('neutral');
    rerender(<Pill icon="clock" label="Turn time" value={60} />);
    expect(toneOf(container)).toBe('neutral');
    expect(container.firstElementChild?.hasAttribute('data-resource-kind')).toBe(false);
  });
});
