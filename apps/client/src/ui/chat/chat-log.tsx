/**
 * Chat transcript and composer (rules spec §6 Chat; technical spec v7 §6.9, §7.5). One
 * component for the lobby (L76), the arena chat sheet (L74) and the read-only Game over chat
 * (L77); it replaces the V6 table `ChatLog` for them, which stays until L75-11.
 *
 * Each line is the round stamp, then the sender's nickname in its seat hue. A side-stream line
 * (eliminated or spectator, which living readers never receive) is italic `--text-2` with its
 * role in words, so the two streams differ by more than color. The transcript scrolls to the
 * newest line whenever `messages` changes, as the V6 log does (Appendix A
 * `chat-new-message-announcement`: a stay-at-bottom rule is a designer call, not decided here).
 * The transcript is a polite `role="log"`, so a screen reader announces each line that
 * arrives once and never reads the log back on a re-render: lines keep their keys, so React
 * leaves the existing nodes alone. An unlabeled ScrollArea is a deliberate choice (brief L72-14):
 * no new §10.6 string, and the sheet's first focusable control stays the message field.
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
import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_SEND_LABEL, chatLineView, type ChatLineView } from './chat-line';

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

  useEffect(() => {
    const node = scroller.current;

    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

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
  };

  return (
    <div>
      <ScrollArea axis="y" ref={scroller} className="h-52 rounded-v7-chrome-sm bg-v7-panel-2 px-3 py-2">
        <div role="log" aria-live="polite">
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
