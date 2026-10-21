// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Button, type ButtonVariant } from './button';

function expectClasses(element: Element, classes: string): void {
  expect([...element.classList]).toEqual(expect.arrayContaining(classes.split(' ')));
}

function describedByIds(element: Element): string[] {
  return (element.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id !== '');
}

describe('Button (technical spec v7 §5.3, §11)', () => {
  it('defaults to a primary type="button" in arcade chrome with a 44 px floor', () => {
    renderUi(<Button>Ready</Button>);
    const button = screen.getByRole('button', { name: 'Ready' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('primary');
    expectClasses(
      button,
      'bg-v7-cta text-v7-text-on-cta rounded-v7-chrome shadow-v7-chrome border-(length:--chrome-outline-width) border-v7-ink min-h-11 font-v7-display',
    );
  });

  it.each([
    ['primary', 'bg-v7-cta', 'text-v7-text-on-cta'],
    ['secondary', 'bg-v7-cta-2', 'text-v7-text-on-cta'],
    ['danger', 'bg-v7-danger', 'text-v7-text-on-cta'],
    ['quiet', 'bg-v7-panel-2', 'text-v7-text'],
  ] as const satisfies readonly (readonly [ButtonVariant, string, string])[])(
    '%s fills with %s and labels with %s',
    (variant, fill, label) => {
      renderUi(<Button variant={variant}>Go</Button>);
      expectClasses(screen.getByRole('button', { name: 'Go' }), `${fill} ${label}`);
    },
  );

  it('a disabled button blocks its handler', async () => {
    const onClick = vi.fn();
    const { user } = renderUi(
      <Button disabled onClick={onClick}>
        Buy
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Buy' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows the disabled reason as visible text linked by aria-describedby (§11)', () => {
    renderUi(
      <Button disabled disabledReason="Not enough points">
        Buy
      </Button>,
    );
    const reason = screen.getByText('Not enough points');
    expect(reason.id).not.toBe('');
    expect(describedByIds(screen.getByRole('button', { name: 'Buy' }))).toContain(reason.id);
  });

  it('shows no reason while enabled; reserveReasonSlot keeps an empty slot', () => {
    const { container, rerender } = renderUi(<Button disabledReason="Not enough points">Buy</Button>);
    expect(screen.queryByText('Not enough points')).toBeNull();
    expect(container.querySelector('[data-reason-slot]')).toBeNull();
    rerender(
      <Button disabledReason="Not enough points" reserveReasonSlot>
        Buy
      </Button>,
    );
    const slot = container.querySelector('[data-reason-slot]');
    expect(slot?.textContent).toBe('');
    expect(slot?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('button', { name: 'Buy' }).hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps a caller aria-describedby next to the reason id', () => {
    renderUi(
      <Button disabled disabledReason="Not your turn" aria-describedby="shop-help">
        Buy
      </Button>,
    );
    const ids = describedByIds(screen.getByRole('button', { name: 'Buy' }));
    expect(ids).toContain('shop-help');
    expect(ids).toContain(screen.getByText('Not your turn').id);
  });

  it('presses 3 px down and drops the shadow when motion is full (§5.3)', () => {
    renderUi(<Button>Ready</Button>);
    const button = screen.getByRole('button', { name: 'Ready' });
    expect(button.getAttribute('data-motion')).toBe('full');
    expectClasses(button, 'enabled:active:translate-y-(--chrome-press-y) enabled:active:shadow-none');
  });

  it('drops the press animation under reduced motion (§5.7)', () => {
    renderUi(<Button>Ready</Button>, { reducedMotion: true });
    const button = screen.getByRole('button', { name: 'Ready' });
    expect(button.getAttribute('data-motion')).toBe('reduced');
    expect(button.className).not.toMatch(/translate/);
  });

  it('renders a decorative icon before the label', () => {
    renderUi(<Button icon="shop">Shop</Button>);
    const button = screen.getByRole('button', { name: 'Shop' });
    const svg = button.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    const label = screen.getByText('Shop');
    expect(svg !== null && svg.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the icon in a --bg-0 well on a CTA fill, never on quiet (DESIGN.md Icons)', () => {
    const { container, rerender } = renderUi(<Button icon="shop">Shop</Button>);
    const well = container.querySelector('[data-icon-well]');
    expect(well?.querySelector('svg')).not.toBeNull();
    expectClasses(well ?? document.body, 'bg-v7-bg-0');
    rerender(
      <Button icon="shop" variant="quiet">
        Shop
      </Button>,
    );
    expect(container.querySelector('[data-icon-well]')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('size lg and fullWidth keep the floor and stretch', () => {
    renderUi(
      <Button size="lg" fullWidth>
        Play solo
      </Button>,
    );
    expectClasses(screen.getByRole('button', { name: 'Play solo' }), 'min-h-14 w-full');
  });
});
