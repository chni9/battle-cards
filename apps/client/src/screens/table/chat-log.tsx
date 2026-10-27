/**
 * Fixed chat transcript — rules spec §6 Chat.
 * Each line is the round, then the seat-colored nickname.
 */

import { chatRoundLabel, type ChatMessageView } from '@card-battle/shared';
import { useEffect, useRef, type ReactElement, type SyntheticEvent } from 'react';

import { Button } from '../../design/components/button';
import { seatColorHex, seatIndexOf } from '../../design/seat-colors';

const UNKNOWN_SEAT = '#4a5d6e';

export interface ChatLogProps {
  messages: readonly ChatMessageView[];
  players: readonly { id: string }[];
  canWrite: boolean;
  onSend: (body: string) => void;
}

export function ChatLog({ messages, players, canWrite, onSend }: ChatLogProps): ReactElement {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scroller.current;

    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

  const send = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get('chat-body');
    const body = typeof raw === 'string' ? raw : '';

    if (body.trim().length === 0 || !canWrite) {
      return;
    }

    onSend(body);
    event.currentTarget.reset();
  };

  return (
    <div>
      <div
        ref={scroller}
        className="h-52 overflow-y-auto rounded-[length:var(--radius-card)] border border-border-soft bg-surface px-2 py-2"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted">No messages yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {messages.map((message) => (
              <ChatLine key={message.order} message={message} players={players} />
            ))}
          </ul>
        )}
      </div>
      {canWrite ? (
        <form className="mt-2 flex gap-2" onSubmit={send}>
          <input
            name="chat-body"
            type="text"
            maxLength={200}
            aria-label="Message"
            placeholder="Message"
            className="min-h-11 min-w-0 flex-1 rounded-[length:var(--radius-control)] border border-border bg-surface px-3 py-2 font-sans text-base text-ink placeholder:text-ink-muted/70"
          />
          <Button compact type="submit" variant="green">
            Send
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function ChatLine({
  message,
  players,
}: {
  message: ChatMessageView;
  players: readonly { id: string }[];
}): ReactElement {
  const seat = seatIndexOf({ players }, message.senderId);
  const color = seat === null ? UNKNOWN_SEAT : seatColorHex(seat);
  const side = message.role !== 'living';

  return (
    <li className={side ? 'text-sm italic text-ink-muted' : 'text-sm text-ink'}>
      <span className="not-italic">{chatRoundLabel(message.round)} </span>
      <span className="font-semibold not-italic" style={{ color }}>
        {message.nickname}
      </span>
      {side ? <span className="not-italic">{` (${message.role})`}</span> : null}
      {': '}
      {message.body}
    </li>
  );
}
