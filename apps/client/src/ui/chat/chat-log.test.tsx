// @vitest-environment happy-dom
import { CHAT_BODY_MAX_LENGTH, type ChatMessageView } from '@card-battle/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { V7_COLORS, v7SeatColor } from '../palette';
import { Sheet } from '../primitives/sheet';
import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_LOG_LABEL, CHAT_SEND_LABEL } from './chat-line';
import { ChatLog, type ChatLogProps } from './chat-log';

const PLAYERS = [{ id: 'p-ana' }, { id: 'p-bo' }];
const msg = (order: number, senderId: string, nickname: string, role: ChatMessageView['role'], body: string, round: number): ChatMessageView =>
  ({ order, senderId, nickname, role, body, round });
const ANA_LOBBY = msg(1, 'p-ana', 'Ana', 'living', 'gl hf', 0);
const BO_ROUND_3 = msg(2, 'p-bo', 'Bo', 'living', 'watch out', 3);
const ANA_ELIMINATED = msg(3, 'p-ana', 'Ana', 'eliminated', 'gg', 4);
const CY_SPECTATOR = msg(4, 'walk-in', 'Cy', 'spectator', 'hi', 4);

// JSX factory, not a component.
const chat = (props: Partial<ChatLogProps> = {}) => (
  <ChatLog messages={[]} players={PLAYERS} canWrite onSend={vi.fn()} {...props} />
);
function setup(props: Partial<ChatLogProps> = {}) {
  const onSend = vi.fn<(body: string) => void>();
  return { onSend, ...renderUi(chat({ onSend, ...props })) };
}
// The color string happy-dom stores for `hex`, independent of normalization.
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}
const input = () => screen.getByRole<HTMLInputElement>('textbox', { name: CHAT_INPUT_LABEL });
const sendButton = () => screen.getByRole('button', { name: CHAT_SEND_LABEL });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChatLog transcript (rules spec §6 Chat, spec v7 §6.9)', () => {
  it('stamps each line with its round label and the sender nickname in its seat hue', () => {
    renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(screen.getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Lobby Ana: gl hf', 'Round 3 Bo: watch out']);
    expect(screen.getByText('Bo').style.color).toBe(cssColor(v7SeatColor(1)));
  });
  it('labels eliminated and spectator lines and styles them apart from living lines', () => {
    renderUi(chat({ messages: [BO_ROUND_3, ANA_ELIMINATED, CY_SPECTATOR] }));
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Round 3 Bo: watch out',
      'Round 4 Ana (eliminated): gg',
      'Round 4 Cy (spectator): hi',
    ]);
    expect(items.map((i) => i.getAttribute('data-chat-stream'))).toEqual(['living', 'side', 'side']);
    expect(screen.getByText('Cy').style.color).toBe(cssColor(V7_COLORS['text-2']));
  });
  it('shows "No messages yet." for an empty transcript', () => {
    renderUi(chat());
    expect(screen.getByText('No messages yet.').textContent).toBe(CHAT_EMPTY_COPY);
    expect(screen.queryByRole('list')).toBeNull();
  });
  it('scrolls the transcript to the newest line when a message arrives', () => {
    // happy-dom defines scrollHeight / scrollTop as accessors on Element.prototype.
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(480);
    const scrollTopSet = vi.spyOn(Element.prototype, 'scrollTop', 'set');
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    scrollTopSet.mockClear();
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(scrollTopSet).toHaveBeenCalledWith(480);
  });
});

describe('ChatLog announcements and wrapping (parity chat-new-message-announcement)', () => {
  it('is a polite log, so a screen reader announces additions and nothing else', () => {
    renderUi(chat({ messages: [ANA_LOBBY] }));
    const log = screen.getByRole('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(log.contains(screen.getByRole('list'))).toBe(true);
  });
  it('keeps the log mounted from the empty state to the first line, so that line is announced', () => {
    const view = renderUi(chat());
    const log = screen.getByRole('log');
    view.rerender(chat({ messages: [ANA_LOBBY] }));
    expect(screen.getByRole('log')).toBe(log);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
  it('adds only the new line to the DOM, so earlier lines are never announced again', () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    const [first] = screen.getAllByRole('listitem');
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(screen.getAllByRole('listitem')[0]).toBe(first);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    view.rerender(chat({ messages: [ANA_LOBBY, { ...BO_ROUND_3 }] }));
    expect(screen.getAllByRole('listitem')[0]).toBe(first);
  });
  it('keys lines by message order, so a revealed earlier line leaves the later ones untouched', () => {
    // An elimination adds the side stream: older lines appear between the ones already shown.
    const view = renderUi(chat({ messages: [ANA_LOBBY, ANA_ELIMINATED] }));
    const [lobby, eliminated] = screen.getAllByRole('listitem');
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3, ANA_ELIMINATED] }));
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Lobby Ana: gl hf',
      'Round 3 Bo: watch out',
      'Round 4 Ana (eliminated): gg',
    ]);
    expect(items[0]).toBe(lobby);
    expect(items[2]).toBe(eliminated);
  });
  it('stays a log on the read-only board, where the transcript is all there is', () => {
    renderUi(chat({ messages: [BO_ROUND_3], canWrite: false }));
    expect(screen.getByRole('log').getAttribute('aria-live')).toBe('polite');
  });
  it('lets a long unbroken body wrap, because the transcript clips its horizontal overflow', () => {
    const long = msg(5, 'p-ana', 'Ana', 'living', 'a'.repeat(CHAT_BODY_MAX_LENGTH), 1);
    renderUi(chat({ messages: [long] }));
    expect(screen.getByRole('listitem').classList.contains('break-words')).toBe(true);
  });
});

describe('ChatLog composer (spec v7 §6.9, §7.5; parity chat-compose-enter)', () => {
  it('sends the trimmed body on Enter, resets the input, and a second Enter sends nothing', async () => {
    const { user, onSend } = setup();
    await user.type(input(), '  hello table  {Enter}');
    expect(onSend.mock.calls).toEqual([['hello table']]);
    expect(input().value).toBe('');
    await user.keyboard('{Enter}');
    expect(onSend.mock.calls).toEqual([['hello table']]);
  });
  it('sends through the Send button the same way', async () => {
    const { user, onSend } = setup();
    await user.type(input(), 'gg');
    await user.click(sendButton());
    expect(onSend).toHaveBeenCalledWith('gg');
    expect(input().value).toBe('');
  });
  it('does not send whitespace-only text', async () => {
    const { user, onSend } = setup();
    await user.type(input(), '   {Enter}');
    await user.click(sendButton());
    expect(onSend).not.toHaveBeenCalled();
  });
  it('keeps Send enabled with an empty input (parity chat-compose-enter: never disabled)', () => {
    renderUi(chat());
    expect(sendButton().hasAttribute('disabled')).toBe(false);
    expect(sendButton().getAttribute('aria-disabled')).toBeNull();
  });
  it('renders no composer when canWrite is false but keeps the transcript', () => {
    renderUi(chat({ messages: [BO_ROUND_3], canWrite: false }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: CHAT_SEND_LABEL })).toBeNull();
  });
  it('caps the input at CHAT_BODY_MAX_LENGTH and keeps the chat-body name', async () => {
    const { user, onSend } = setup();
    expect(input().getAttribute('maxlength')).toBe(String(CHAT_BODY_MAX_LENGTH));
    expect(input().getAttribute('name')).toBe('chat-body');
    await user.click(input());
    await user.paste('a'.repeat(CHAT_BODY_MAX_LENGTH + 5));
    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledWith('a'.repeat(CHAT_BODY_MAX_LENGTH));
  });
  it('uses "Message" by default and accepts a label and placeholder override (walk-in, L76)', () => {
    const { unmount } = renderUi(chat());
    expect(screen.getByRole('textbox', { name: 'Message' }).getAttribute('placeholder')).toBe('Message');
    unmount();
    const walkIn = 'Spectators only see this';
    renderUi(chat({ inputLabel: walkIn, placeholder: walkIn }));
    expect(screen.getByRole('textbox', { name: walkIn }).getAttribute('placeholder')).toBe(walkIn);
  });
});

describe('ChatLog transcript region (WCAG 2.1.1; fix round 1)', () => {
  it('names the transcript "Chat" as a focusable region that holds the log', () => {
    renderUi(chat({ messages: [ANA_LOBBY] }));
    const region = screen.getByRole('region', { name: 'Chat' });
    expect(CHAT_LOG_LABEL).toBe('Chat');
    expect(region.tabIndex).toBe(0);
    expect(region.contains(screen.getByRole('log'))).toBe(true);
  });
  it('keeps the message field as the sheet initial focus when there is a composer', () => {
    renderUi(
      <Sheet open mode="read-only" title="Chat" onClose={vi.fn()}>
        {chat({ messages: [ANA_LOBBY] })}
      </Sheet>,
    );
    expect(document.activeElement).toBe(input());
  });
  it('gives the named region the sheet initial focus when the transcript is read-only', () => {
    renderUi(
      <Sheet open mode="read-only" title="Chat" onClose={vi.fn()}>
        {chat({ messages: [ANA_LOBBY], canWrite: false })}
      </Sheet>,
    );
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Chat' }));
  });
});

interface ScrollBox {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}
const BOX_HEIGHT = 480;
const BOX_VIEW = 208;
const BOX_BOTTOM = BOX_HEIGHT - BOX_VIEW;

/**
 * Give the transcript scroller a geometry of its own (happy-dom has no layout) and record every
 * `scrollTop` write. It is stubbed on the element, after the first render, so the open scroll
 * ran against happy-dom's zeros and the stub only sees what happens next.
 */
function stubScroller(box: ScrollBox): { scroller: HTMLElement; writes: number[] } {
  const scroller = screen.getByRole('region', { name: CHAT_LOG_LABEL });
  const writes: number[] = [];
  Object.defineProperties(scroller, {
    scrollHeight: { configurable: true, get: () => box.scrollHeight },
    clientHeight: { configurable: true, get: () => box.clientHeight },
    scrollTop: {
      configurable: true,
      get: () => box.scrollTop,
      set: (value: number) => {
        box.scrollTop = value;
        writes.push(value);
      },
    },
  });
  return { scroller, writes };
}
/** A reader scrolling: the position changes, then the browser fires `scroll`. */
function readerScrollsTo(scroller: HTMLElement, box: ScrollBox, top: number): void {
  box.scrollTop = top;
  fireEvent.scroll(scroller);
}

describe('ChatLog sticks to the bottom only when the reader is there (designer 2026-10-26)', () => {
  it('scrolls to the newest line when the chat opens', () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(BOX_HEIGHT);
    const scrollTopSet = vi.spyOn(Element.prototype, 'scrollTop', 'set');
    renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(scrollTopSet).toHaveBeenCalledWith(BOX_HEIGHT);
  });
  it.each([
    ['at the very bottom', BOX_BOTTOM],
    ['within 24 px of the bottom', BOX_BOTTOM - 24],
  ])('follows a new line while the reader is %s', (_, top) => {
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: 0 };
    const { scroller, writes } = stubScroller(box);
    readerScrollsTo(scroller, box, top);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(writes).toEqual([BOX_HEIGHT]);
  });
  it('stays put when the reader is more than 24 px up, and does not move again on the next line', () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM - 25 };
    const { scroller, writes } = stubScroller(box);
    readerScrollsTo(scroller, box, BOX_BOTTOM - 25);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3, ANA_ELIMINATED] }));
    expect(writes).toEqual([]);
    expect(box.scrollTop).toBe(BOX_BOTTOM - 25);
  });
  it('follows again once the reader scrolls back to the bottom', () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { scroller, writes } = stubScroller(box);
    readerScrollsTo(scroller, box, 0);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(writes).toEqual([]);
    readerScrollsTo(scroller, box, BOX_BOTTOM);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3, ANA_ELIMINATED] }));
    expect(writes).toEqual([BOX_HEIGHT]);
  });
  it('does not scroll when the same messages arrive in a new array', () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { writes } = stubScroller(box);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    view.rerender(chat({ messages: [{ ...ANA_LOBBY }, { ...BO_ROUND_3 }], canWrite: true }));
    expect(writes).toEqual([]);
  });
  it('keeps a reader at the bottom there when earlier lines are revealed above the newest', () => {
    // An elimination opens the side stream: older lines join the list, the newest is unchanged.
    const view = renderUi(chat({ messages: [ANA_LOBBY, ANA_ELIMINATED] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { writes } = stubScroller(box);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3, ANA_ELIMINATED] }));
    expect(writes).toEqual([BOX_HEIGHT]);
  });
  it('follows a newer line that replaces an older one, where the count does not change', () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { writes } = stubScroller(box);
    view.rerender(chat({ messages: [BO_ROUND_3, ANA_ELIMINATED] }));
    expect(writes).toEqual([BOX_HEIGHT]);
  });
  it('scrolls down on the reader own send, even from far up, and the echoed line then follows', async () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { scroller, writes } = stubScroller(box);
    readerScrollsTo(scroller, box, 0);
    await view.user.type(input(), 'gg{Enter}');
    expect(writes).toEqual([BOX_HEIGHT]);
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3, ANA_ELIMINATED] }));
    expect(writes).toEqual([BOX_HEIGHT, BOX_HEIGHT]);
  });
  it('does not scroll on a send that sends nothing', async () => {
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { scroller, writes } = stubScroller(box);
    readerScrollsTo(scroller, box, 0);
    await view.user.type(input(), '   {Enter}');
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(writes).toEqual([]);
  });
});

/** happy-dom's ResizeObserver never fires, so a test fires it by hand. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observe = vi.fn<(target: Element) => void>();
  readonly unobserve = vi.fn<(target: Element) => void>();
  readonly disconnect = vi.fn<() => void>();
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  resize(): void {
    this.callback([], this);
  }
}

describe('ChatLog keeps a reader at the bottom when the content size changes (a sheet mounts hidden)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.instances = [];
  });
  function renderWithObserver() {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const view = renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    const [observer] = FakeResizeObserver.instances;
    if (observer === undefined) throw new Error('ChatLog did not observe its content');
    return { view, observer };
  }
  it('observes the log content and sticks it to the end when it resizes at the bottom', () => {
    const { observer } = renderWithObserver();
    expect(observer.observe).toHaveBeenCalledWith(screen.getByRole('log'));
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: 0 };
    const { writes } = stubScroller(box);
    observer.resize();
    expect(writes).toEqual([BOX_HEIGHT]);
  });
  it('leaves a reader who scrolled up where they are when the content resizes', () => {
    const { observer } = renderWithObserver();
    const box = { scrollHeight: BOX_HEIGHT, clientHeight: BOX_VIEW, scrollTop: BOX_BOTTOM };
    const { scroller, writes } = stubScroller(box);
    readerScrollsTo(scroller, box, 0);
    observer.resize();
    expect(writes).toEqual([]);
  });
  it('stops observing when the chat unmounts', () => {
    const { view, observer } = renderWithObserver();
    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });
});
