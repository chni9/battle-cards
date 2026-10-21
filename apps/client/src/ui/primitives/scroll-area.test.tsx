// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { ScrollArea } from './scroll-area';

function expectClasses(element: Element | null, classes: string): void {
  expect([...(element?.classList ?? [])]).toEqual(expect.arrayContaining(classes.split(' ')));
}

describe('ScrollArea (L53-07: overlays and logs scroll inside, never the page)', () => {
  it('scrolls on y by default and contains overscroll', () => {
    const { container } = renderUi(<ScrollArea>Lines</ScrollArea>);
    expectClasses(container.querySelector('[data-scroll-axis="y"]'), 'overflow-y-auto overscroll-y-contain');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it.each([
    ['x', 'overflow-x-auto', 'overscroll-x-contain'],
    ['both', 'overflow-auto', 'overscroll-contain'],
  ] as const)('axis %s uses %s and %s', (axis, overflow, overscroll) => {
    const { container } = renderUi(<ScrollArea axis={axis}>Lines</ScrollArea>);
    expectClasses(container.querySelector(`[data-scroll-axis="${axis}"]`), `${overflow} ${overscroll}`);
  });

  it('is positioned, so sr-only and absolute descendants stay inside its clip', () => {
    const { container } = renderUi(
      <ScrollArea axis="x">
        <span className="sr-only">Lives 4</span>
      </ScrollArea>,
    );
    expect(container.querySelector('[data-scroll-axis="x"]')?.classList.contains('relative')).toBe(true);
  });

  it('a label makes it a focusable named region', () => {
    renderUi(<ScrollArea label="Action log">Lines</ScrollArea>);
    expect(screen.getByRole('region', { name: 'Action log' }).tabIndex).toBe(0);
  });

  it('forwards its ref to the scrolling element', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderUi(<ScrollArea ref={ref}>Lines</ScrollArea>);
    expect(ref.current).toBe(container.querySelector('[data-scroll-axis]'));
  });
});
