// @vitest-environment happy-dom
/** The shared live-mark reader: technical spec v7 §6.12; Lot 75 final review M2. */
import { afterEach, describe, expect, it } from 'vitest';

import { liveTutorialMarks } from './live-tutorial-marks';

const RECT = new DOMRect(10, 20, 30, 40);

function mount(html: string, rects: Readonly<Record<string, DOMRect>> = {}): void {
  document.body.innerHTML = html;
  for (const element of Array.from(document.body.querySelectorAll<HTMLElement>('[id]'))) {
    element.getBoundingClientRect = () => rects[element.id] ?? RECT;
  }
}
afterEach(() => { document.body.innerHTML = ''; });

describe('liveTutorialMarks', () => {
  it('reads the table marks while no sheet is live, with their ids and rects', () => {
    mount('<div id="a" data-tutorial-highlight="hand"></div><div id="b" data-tutorial-highlight="opponent"></div>');
    expect(liveTutorialMarks(null)).toEqual([
      { id: 'hand', rect: { left: 10, top: 20, width: 30, height: 40 } },
      { id: 'opponent', rect: { left: 10, top: 20, width: 30, height: 40 } },
    ]);
  });

  it('reads only the live sheet layer while a sheet is live', () => {
    mount('<div id="a" data-tutorial-highlight="hand"></div><div data-zone="sheet-overlay" data-sheet-id="s1"><div id="b" data-tutorial-highlight="use"></div></div>');
    expect(liveTutorialMarks('s1').map((mark) => mark.id)).toEqual(['use']);
    expect(liveTutorialMarks(null).map((mark) => mark.id)).toEqual(['hand']);
  });

  it('skips an inert subtree and an empty rect', () => {
    mount('<div inert><div id="a" data-tutorial-highlight="hand"></div></div><div id="b" data-tutorial-highlight="flag"></div><div id="c" data-tutorial-highlight="timer"></div>', {
      b: new DOMRect(0, 0, 0, 40),
    });
    expect(liveTutorialMarks(null).map((mark) => mark.id)).toEqual(['timer']);
  });

  it('applies the same filter to another selector, with an empty id', () => {
    mount('<button id="a" data-target-seat="valid"></button><button id="b" data-target-seat="invalid"></button>');
    expect(liveTutorialMarks(null, '[data-target-seat="valid"]')).toEqual([{ id: '', rect: { left: 10, top: 20, width: 30, height: 40 } }]);
  });
});
