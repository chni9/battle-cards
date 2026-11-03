// @vitest-environment happy-dom
/**
 * V7 resource flash: technical spec v7 §6.12, §8.3; Appendix A `table-fx-resource-flash`,
 * `table-fx-token-chips`. The V2 `ResourceIcon` logic (L51-09, L51-15, L51-16) for arena values (L74-17).
 */
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setReducedMotion } from '../test/render';
import { RESOURCE_FLASH_MS } from './motion-timing';
import { emitResourceFlowFlash, resetResourceFlowFlashForTests } from './resource-flow-flash';
import { TableFxContext, type TableFxContextValue, type TableFxInput } from './table-fx-hooks';
import { skipResourceIconFlyout } from './token-flyout-skip';
import { useResourceFlash, type ResourceFlashInput } from './use-resource-flash';

const anchors: HTMLElement[] = [];
function anchor(attributes: Readonly<Record<string, string>>, rect: DOMRect, parent: HTMLElement = document.body): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.append(element);
  anchors.push(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  return element;
}
/** The POV's point value and the log endpoint (`measureTokenFlyout` without a playerId). */
function povPointAnchors(): void {
  const resources = anchor({ 'data-zone': 'resources' }, new DOMRect(0, 500, 400, 40));
  anchor({ 'data-resource-kind': 'point' }, new DOMRect(200, 505, 40, 28), resources);
  anchor({ 'data-zone': 'log-collapsed' }, new DOMRect(0, 60, 400, 20));
}
function renderFlash(initial: ResourceFlashInput) {
  const enqueue = vi.fn<(event: TableFxInput) => void>();
  const value: TableFxContextValue = { enqueue, events: [] };
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => createElement(TableFxContext.Provider, { value }, children);
  return { enqueue, ...renderHook((props: ResourceFlashInput) => useResourceFlash(props), { initialProps: initial, wrapper }) };
}

afterEach(() => {
  for (const element of anchors.splice(0)) element.remove();
  resetResourceFlowFlashForTests();
});

describe('useResourceFlash (L74-17)', () => {
  it('a POV gain floats +N and flies one chip per point from the log to the value (L51-09)', () => {
    povPointAnchors();
    const { result, rerender, enqueue } = renderFlash({ kind: 'point', value: 10 });
    rerender({ kind: 'point', value: 13 });
    expect(result.current).toEqual({ tone: 'gain', gain: 3, loss: 0 });
    expect(enqueue.mock.calls.map(([event]) => event.kind)).toEqual(['tokenFlyout', 'tokenFlyout', 'tokenFlyout']);
  });

  it('a delta the overlay already flew neither flies nor floats; its emitted flash floats (L51-15, L51-16)', () => {
    povPointAnchors();
    const { result, rerender, enqueue } = renderFlash({ kind: 'point', value: 10 });
    skipResourceIconFlyout('self', 'point');
    rerender({ kind: 'point', value: 13 });
    expect(result.current.tone).toBeNull();
    act(() => { emitResourceFlowFlash('self', 'point', 3); });
    expect(result.current).toEqual({ tone: 'gain', gain: 3, loss: 0 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('a hidden seat value flashes the public chip amount and never flies (L51-16)', () => {
    const { result, enqueue } = renderFlash({ kind: 'life', value: 'unknown', playerId: 'p1' });
    act(() => { emitResourceFlowFlash('p1', 'life', -2); });
    expect(result.current).toEqual({ tone: 'loss', gain: 0, loss: -2 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('clears after RESOURCE_FLASH_MS, and under reduced motion flashes without flying (§8.3)', () => {
    vi.useFakeTimers();
    setReducedMotion(true);
    povPointAnchors();
    const { result, rerender, enqueue } = renderFlash({ kind: 'point', value: 10 });
    rerender({ kind: 'point', value: 8 });
    expect(result.current).toEqual({ tone: 'loss', gain: 0, loss: -2 });
    expect(enqueue).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(RESOURCE_FLASH_MS); });
    expect(result.current).toEqual({ tone: null, gain: 0, loss: 0 });
  });
});
