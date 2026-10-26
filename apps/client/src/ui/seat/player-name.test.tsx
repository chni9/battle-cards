// @vitest-environment happy-dom
/**
 * PlayerName — L39-03 (a nickname in its seat color) under technical spec v7 §5.1 (the eight
 * `--seat-*` hues; an inline hex from `v7SeatColor`, never `var()`) and §5.2 (seat names are
 * Lilita One). Same props and seat resolution as V2's `PlayerName`.
 */

import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { v7SeatColor } from '../palette';
import { PlayerName } from './player-name';

/** A hex as the DOM reads it back: happy-dom normalizes colors, so the test compares like with like. */
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}

function nameSpan(ui: ReactElement): HTMLSpanElement {
  const span = renderUi(ui).container.querySelector('span');
  if (span === null) {
    throw new Error('No nickname span was rendered');
  }
  return span;
}

const VIEW = { players: [{ id: 'p-ana' }, { id: 'p-bo' }, { id: 'p-cy' }] };
const seatOf = (ui: ReactElement) => nameSpan(ui).getAttribute('data-seat-index');

describe('PlayerName (V7 · L39-03)', () => {
  it('colors the nickname with the V7 hue of an explicit seat', () => {
    const span = nameSpan(<PlayerName nickname="Ana" seatIndex={3} />);
    expect(span.textContent).toBe('Ana');
    expect(span.getAttribute('data-seat-index')).toBe('3');
    expect(span.style.color).toBe(cssColor(v7SeatColor(3)));
  });

  it('clamps an explicit seat into the 0–7 palette', () => {
    expect(seatOf(<PlayerName nickname="Hi" seatIndex={11} />)).toBe('7');
    expect(seatOf(<PlayerName nickname="Lo" seatIndex={-2} />)).toBe('0');
  });

  it('resolves the seat from view.players when no seat is given', () => {
    const span = nameSpan(<PlayerName nickname="Bo" playerId="p-bo" view={VIEW} />);
    expect(span.getAttribute('data-seat-index')).toBe('1');
    expect(span.style.color).toBe(cssColor(v7SeatColor(1)));
  });

  it('prefers the explicit seat over the view', () => {
    expect(seatOf(<PlayerName nickname="Bo" playerId="p-bo" view={VIEW} seatIndex={6} />)).toBe('6');
  });

  it('leaves an unknown or unseated player uncolored', () => {
    const span = nameSpan(<PlayerName nickname="Zed" playerId="p-zed" view={VIEW} />);
    expect(span.textContent).toBe('Zed');
    expect(span.hasAttribute('data-seat-index')).toBe(false);
    expect(span.style.color).toBe('');
    expect(seatOf(<PlayerName nickname="Solo" />)).toBeNull();
  });

  it('colors only the nickname in the possessive form', () => {
    const { container } = renderUi(<PlayerName nickname="Cy" playerId="p-cy" view={VIEW} possessive />);
    expect(container.textContent).toBe("Cy's");
    expect(container.querySelector('span')?.textContent).toBe('Cy');
  });

  it('passes className to the nickname span', () => {
    expect(nameSpan(<PlayerName nickname="Ana" seatIndex={0} className="truncate" />).classList.contains('truncate')).toBe(true);
  });
});
