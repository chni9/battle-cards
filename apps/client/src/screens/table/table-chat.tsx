/**
 * Table chat popup — rules spec §6 Chat.
 * The control sits next to Forfeit. Unread is how many messages arrived since it closed.
 */

import type { ChatMessageView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { IconButton } from '../../design/components/icon-button';
import { chatUnreadCount } from './chat-unread';
import { ChatLog } from './chat-log';

export interface TableChatProps {
  messages: readonly ChatMessageView[];
  players: readonly { id: string }[];
  canWrite: boolean;
  onSend: (body: string) => void;
}

export function TableChat({ messages, players, canWrite, onSend }: TableChatProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(messages.length);

  const unread = chatUnreadCount({
    messageCount: messages.length,
    seenCount,
    open,
  });

  const closeChat = (): void => {
    setSeenCount(messages.length);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <IconButton
        aria-label={unread > 0 ? `Chat, ${String(unread)} unread` : 'Chat'}
        onClick={() => {
          if (open) {
            closeChat();
            return;
          }

          setSeenCount(messages.length);
          setOpen(true);
        }}
      >
        <ChatIcon />
      </IconButton>
      {unread > 0 ? (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cta-red px-1 text-[10px] font-semibold text-white">
          {unread}
        </span>
      ) : null}
      <Dialog
        open={open}
        title="Chat"
        onClose={closeChat}
        panelClassName="max-w-md"
        actions={
          <Button compact type="button" variant="orange" onClick={closeChat}>
            Close
          </Button>
        }
      >
        <ChatLog messages={messages} players={players} canWrite={canWrite} onSend={onSend} />
      </Dialog>
    </div>
  );
}

function ChatIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden className="text-ink">
      <path
        fill="currentColor"
        d="M5 4.75h14A1.25 1.25 0 0 1 20.25 6v9A1.25 1.25 0 0 1 19 16.25H9.1L5.4 19.4a.75.75 0 0 1-1.15-.64V6A1.25 1.25 0 0 1 5 4.75z"
      />
    </svg>
  );
}
