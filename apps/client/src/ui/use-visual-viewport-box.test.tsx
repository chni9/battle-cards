// @vitest-environment happy-dom
/** Visible-box hooks — L53-07, technical spec v7 §6.4. */
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { isTextEntryElement, useViewportMode, useVisualViewportBox } from './use-visual-viewport-box';

type FakeViewport = EventTarget & { width: number; height: number; offsetTop: number; offsetLeft: number };

const STUBBED_KEYS = ['visualViewport', 'innerWidth', 'innerHeight'] as const;
const originals = new Map(STUBBED_KEYS.map((key) => [key, Object.getOwnPropertyDescriptor(window, key)]));
let fake: FakeViewport;

function stubWindow(key: (typeof STUBBED_KEYS)[number], value: unknown): void {
  Object.defineProperty(window, key, { configurable: true, value });
}

function resize(width: number, height: number): void {
  act(() => {
    fake.width = width;
    fake.height = height;
    fake.dispatchEvent(new Event('resize'));
  });
}

function BoxProbe() {
  const { width, height, offsetTop } = useVisualViewportBox();
  return <output data-testid="box">{`${width}x${height}+${offsetTop}`}</output>;
}

function ModeProbe() {
  return <output data-testid="mode">{useViewportMode()}</output>;
}

beforeEach(() => {
  fake = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 });
  stubWindow('visualViewport', fake);
});

afterEach(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor === undefined) Reflect.deleteProperty(window, key);
    else Object.defineProperty(window, key, descriptor);
  }
});

describe('useVisualViewportBox (L53-07)', () => {
  it('reads the visible box on mount', () => {
    renderUi(<BoxProbe />);
    expect(screen.getByTestId('box').textContent).toBe('390x844+0');
  });

  it('follows visualViewport resize and scroll', () => {
    renderUi(<BoxProbe />);
    resize(844, 390);
    expect(screen.getByTestId('box').textContent).toBe('844x390+0');
    act(() => {
      fake.offsetTop = 120;
      fake.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByTestId('box').textContent).toBe('844x390+120');
  });

  it('removes its visualViewport listeners on unmount', () => {
    const removed = vi.spyOn(fake, 'removeEventListener');
    const { unmount } = renderUi(<BoxProbe />);
    unmount();
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['resize', 'scroll']));
  });
});

describe('useViewportMode (technical spec v7 §6.4)', () => {
  it('maps the visible box to a layout mode', () => {
    renderUi(<ModeProbe />);
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
    resize(844, 390);
    expect(screen.getByTestId('mode').textContent).toBe('landscape-compact');
    resize(1440, 900);
    expect(screen.getByTestId('mode').textContent).toBe('desktop');
  });

  it('falls back to the window size when the visualViewport API is absent (L72-09)', () => {
    stubWindow('visualViewport', undefined);
    stubWindow('innerWidth', 1440);
    stubWindow('innerHeight', 900);
    renderUi(<BoxProbe />);
    expect(screen.getByTestId('box').textContent).toBe('1440x900+0');
  });

  it('falls back to the window size when visualViewport is null', () => {
    stubWindow('visualViewport', null);
    stubWindow('innerWidth', 1440);
    stubWindow('innerHeight', 900);
    renderUi(<ModeProbe />);
    expect(screen.getByTestId('mode').textContent).toBe('desktop');
    act(() => {
      stubWindow('innerWidth', 390);
      stubWindow('innerHeight', 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
  });
});

function HoldProbe() {
  const mode = useViewportMode();
  const { width, height } = useVisualViewportBox();
  return (
    <div>
      <output data-testid="mode">{mode}</output>
      <output data-testid="box">{`${width}x${height}`}</output>
      <input aria-label="Message" />
      <input aria-label="Contact" />
    </div>
  );
}

describe('useViewportMode keyboard hold (L75-02, ruling 7, U1)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('holds its mode while a text field has focus and follows on blur; the box stays live', async () => {
    const { user } = renderUi(<HoldProbe />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    await user.click(field);
    resize(390, 420); // the keyboard opens: the visible box shrinks under 500 px
    expect([screen.getByTestId('mode').textContent, screen.getByTestId('box').textContent]).toEqual(['portrait', '390x420']);
    act(() => { field.blur(); });
    expect(screen.getByTestId('mode').textContent).toBe('landscape-compact');
  });

  it('keeps the hold across a move from one text field to another, though Chrome reports <body> as active in between (Lot 75 Check 1)', async () => {
    const { user } = renderUi(<HoldProbe />);
    const fieldA = screen.getByRole('textbox', { name: 'Message' });
    const fieldB = screen.getByRole('textbox', { name: 'Contact' });
    await user.click(fieldA);
    resize(390, 300); // the keyboard opens on a short phone: 390 wide over 300 tall would read landscape-compact
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
    // Chrome runs blur(A) and focusout(A, relatedTarget B) while document.activeElement is <body>; focus(B) and
    // focusin(B) follow. happy-dom switches the active element first, which hid the flip from the earlier test.
    const active = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body);
    act(() => { fieldA.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: fieldB })); });
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
    active.mockReturnValue(fieldB);
    act(() => { fieldB.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: fieldA })); });
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
    active.mockRestore();
    act(() => { fieldA.blur(); }); // a real blur with no field to land on ends the hold
    expect(screen.getByTestId('mode').textContent).toBe('landscape-compact');
  });

  it('ends the hold when the focus leaves for something that is not a text field', async () => {
    const { user } = renderUi(<HoldProbe />);
    const fieldA = screen.getByRole('textbox', { name: 'Message' });
    await user.click(fieldA);
    resize(390, 300);
    expect(screen.getByTestId('mode').textContent).toBe('portrait');
    const active = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body);
    act(() => { fieldA.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })); });
    active.mockRestore();
    expect(screen.getByTestId('mode').textContent).toBe('landscape-compact');
  });
});

describe('isTextEntryElement (L75-02 m6)', () => {
  const input = (type: string): HTMLInputElement => Object.assign(document.createElement('input'), { type });

  it('accepts a textarea, a text-like input and a contenteditable element', () => {
    const editable = document.createElement('div');
    // happy-dom reflects `isContentEditable` from the attribute only for a connected element.
    editable.setAttribute('contenteditable', 'true');
    document.body.append(editable);
    expect([
      isTextEntryElement(document.createElement('textarea')),
      ...['text', 'search', 'email', 'password', 'number', 'url'].map((type) => isTextEntryElement(input(type))),
      isTextEntryElement(editable),
    ]).toEqual([true, true, true, true, true, true, true, true]);
    editable.remove();
  });

  it('rejects the input types that bring up no keyboard, a plain element and null', () => {
    const types = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'];
    expect(types.map((type) => isTextEntryElement(input(type)))).toEqual(types.map(() => false));
    expect([isTextEntryElement(document.createElement('div')), isTextEntryElement(document.createElement('button')), isTextEntryElement(null)]).toEqual([false, false, false]);
  });
});
