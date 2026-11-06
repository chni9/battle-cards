// @vitest-environment happy-dom
/** The shared live-mark reader: technical spec v7 §6.12; Lot 75 final review M2. */
import { afterEach, describe, expect, it } from 'vitest';

import { liveTutorialMarkIds, liveTutorialMarks, revealOffset, revealTutorialMarks } from './live-tutorial-marks';

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

  it('cuts a mark to what its clipping ancestors show, and skips one they hide (L75-12 Gate C)', () => {
    mount(
      '<div id="port" style="overflow-x: auto; overflow-y: hidden"><div id="a" data-tutorial-highlight="hand"></div><div id="b" data-tutorial-highlight="specials"></div></div>',
      { port: new DOMRect(282, 265, 212, 125), a: new DOMRect(302, 266, 241, 97), b: new DOMRect(555, 266, 65, 97) },
    );
    expect(liveTutorialMarks(null)).toEqual([{ id: 'hand', rect: { left: 302, top: 266, width: 192, height: 97 } }]);
    expect(liveTutorialMarkIds(null)).toBe('hand specials');
  });
});

describe('revealOffset', () => {
  it('is 0 when the target fits, else lines up the nearest edge, or the start of a longer target', () => {
    expect(revealOffset({ start: 300, end: 400 }, { start: 282, end: 494 })).toBe(0);
    expect(revealOffset({ start: 555, end: 620 }, { start: 282, end: 494 })).toBe(126);
    expect(revealOffset({ start: 200, end: 260 }, { start: 282, end: 494 })).toBe(-82);
    expect(revealOffset({ start: 302, end: 543 }, { start: 282, end: 494 })).toBe(20);
  });
});

describe('revealTutorialMarks', () => {
  it("scrolls a hidden mark's scrollport so it shows, and leaves a port that does not overflow alone", () => {
    mount(
      '<div id="port" style="overflow-x: auto"><div id="b" data-tutorial-highlight="specials"></div></div><div id="still" style="overflow-x: auto"><div id="c" data-tutorial-highlight="draw"></div></div>',
      { port: new DOMRect(282, 265, 212, 125), b: new DOMRect(555, 266, 65, 97), still: new DOMRect(0, 0, 100, 40), c: new DOMRect(200, 0, 40, 40) },
    );
    const [port, still] = ['port', 'still'].map((id) => {
      const element = document.getElementById(id);
      if (element === null) throw new Error(`no #${id}`);
      return element;
    });
    if (port === undefined || still === undefined) throw new Error('no scrollports');
    Object.defineProperties(port, { scrollWidth: { value: 350 }, clientWidth: { value: 212 } });
    Object.defineProperties(still, { scrollWidth: { value: 100 }, clientWidth: { value: 100 } });
    revealTutorialMarks(null);
    expect([port.scrollLeft, still.scrollLeft]).toEqual([126, 0]);
  });
});
