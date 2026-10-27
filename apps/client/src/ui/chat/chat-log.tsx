/**
 * Chat transcript and composer (rules spec §6 Chat; technical spec v7 §6.9, §7.5). One
 * component for the lobby (L76), the arena chat sheet (L74) and the read-only Game over chat
 * (L77); it replaces the V6 table `ChatLog` for them, which stays until L75-11.
 *
 * Each line is the round stamp, then the sender's nickname in its seat hue. A side-stream line
 * (eliminated or spectator, which living readers never receive) is italic `--text-2` with its
 * role in words, so the two streams differ by more than color.
 *
 * The transcript opens on the newest line and then sticks to the bottom only while the reader
 * is there (designer 2026-10-26, `decisions.md`, which narrows the Appendix A
 * `chat-new-message-announcement` Keep line): a new line follows a reader within
 * `STICK_THRESHOLD_PX` of the end and leaves one who scrolled up where they are. The reader's own
 * send always scrolls down. "New line" is a changed count or newest `order`, never a new array
 * identity. A `ResizeObserver` on the content covers what a message change cannot: a sheet
 * mounts its content hidden (no layout, so the open scroll does nothing) and shows it a moment
 * later, and a font swap or a rewrap changes the height. The transcript is a polite
 * `role="log"`, so a screen reader announces each line that
 * arrives once and never reads the log back on a re-render: lines keep their keys, so React
 * leaves the existing nodes alone.
 *
 * The transcript is a named focusable region ("Chat", WCAG 2.1.1), so a keyboard user can scroll
 * it. `ScrollArea` marks a labelled region `data-scroll-region`, so a sheet's initial focus still
 * goes to the message field and falls to the region only on the read-only board.
 *
 * The composer renders only when `canWrite` (never on the finished board). It stays
 * uncontrolled and sends the trimmed body, dropping an empty one without a reset. Send is never
 * disabled: there is no empty-state to track on an uncontrolled field, a native `disabled` would
 * drop the button from the Tab order, and the parity row `chat-compose-enter` keeps it enabled.
 */

import { CHAT_BODY_MAX_LENGTH, type ChatMessageView } from '@card-battle/shared';
import { useEffect, useRef, type ReactElement, type SyntheticEvent } from 'react';

import { V7_COLORS, v7SeatColor } from '../palette';
import { Button } from '../primitives/button';
import { ScrollArea } from '../primitives/scroll-area';
import { TextField } from '../primitives/text-field';
import {
  CHAT_EMPTY_COPY,
  CHAT_INPUT_LABEL,
  CHAT_LOG_LABEL,
  CHAT_SEND_LABEL,
  chatLineView,
  type ChatLineView,
} from './chat-line';

/** A reader this close to the end of the transcript (px) still counts as at the bottom. */
const STICK_THRESHOLD_PX = 24;

export interface ChatLogProps {
  messages: readonly ChatMessageView[];
  players: readonly { id: string }[];
  canWrite: boolean;
  onSend: (body: string) => void;
  /** The input's accessible name; the lobby passes the walk-in label (L76). */
  inputLabel?: string;
  placeholder?: string;
}

export function ChatLog({
  messages,
  players,
  canWrite,
  onSend,
  inputLabel = CHAT_INPUT_LABEL,
  placeholder = CHAT_INPUT_LABEL,
}: ChatLogProps): ReactElement {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  /** Whether the reader is at the bottom, so the next new line should follow. Starts true: open on the newest. */
  const stuck = useRef(true);
  const count = messages.length;
  const newestOrder = messages[count - 1]?.order;

  // Follow the reader's own scrolling, not the layout: a font swap or a resize that changes the
  // height does not unstick a reader who has not moved. The observer sticks the content to the end
  // whenever its size changes while the reader is there.
  useEffect(() => {
    const node = scroller.current;
    const body = content.current;

    if (node === null || body === null) {
      return;
    }

    const follow = (): void => {
      stuck.current = node.scrollHeight - node.clientHeight - node.scrollTop <= STICK_THRESHOLD_PX;
    };
    const stick = (): void => {
      if (stuck.current) {
        node.scrollTop = node.scrollHeight;
      }
    };
    const observer = new ResizeObserver(stick);

    node.addEventListener('scroll', follow, { passive: true });
    observer.observe(body);

    return () => {
      node.removeEventListener('scroll', follow);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const node = scroller.current;

    if (node !== null && stuck.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [count, newestOrder]);

  const send = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = new FormData(form).get('chat-body');
    const body = typeof raw === 'string' ? raw.trim() : '';

    if (body.length === 0 || !canWrite) {
      return;
    }

    onSend(body);
    form.reset();
    // The sender wants to see their own line: scroll now and keep following until it arrives.
    stuck.current = true;

    if (scroller.current !== null) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  };

  return (
    <div>
      <ScrollArea axis="y" label={CHAT_LOG_LABEL} ref={scroller} className="h-52 rounded-v7-chrome-sm bg-v7-panel-2 px-3 py-2">
        <div ref={content} role="log" aria-live="polite">
          {messages.length === 0 ? (
            <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{CHAT_EMPTY_COPY}</p>
          ) : (
            <ul className="space-y-1.5">
              {messages.map((message) => {
                const line = chatLineView(message, players);

                return <ChatLine key={line.key} line={line} />;
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
      {canWrite ? (
        <form className="mt-2 flex items-end gap-2" onSubmit={send}>
          <TextField
            type="text"
            name="chat-body"
            label={inputLabel}
            labelHidden
            placeholder={placeholder}
            maxLength={CHAT_BODY_MAX_LENGTH}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary">
            {CHAT_SEND_LABEL}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function ChatLine({ line }: { line: ChatLineView }): ReactElement {
  return (
    <li
      data-chat-stream={line.side ? 'side' : 'living'}
      className={`break-words font-v7-body text-v7-body font-bold ${line.side ? 'italic text-v7-text-2' : 'text-v7-text'}`}
    >
      <span className="text-v7-caption not-italic text-v7-text-2">{line.roundLabel}</span>
      {' '}
      <span
        className="font-v7-display font-normal not-italic"
        style={{ color: line.seatIndex === null ? V7_COLORS['text-2'] : v7SeatColor(line.seatIndex) }}
      >
        {line.nickname}
      </span>
      {line.roleLabel === null ? null : <span className="not-italic">{` ${line.roleLabel}`}</span>}
      {': '}
      {line.body}
    </li>
  );
}
