/**
 * The lobby chat panel (technical spec v7 §7.5, §10.6 Q21; parity `lobby-chat`,
 * `lobby-chat-walk-in-spectator-stream`). A `--panel` card under the seats: an `<h2>` holding a
 * disclosure button named "Chat", then the `ui/chat` `ChatLog`. It starts open on every viewport
 * and reads no viewport mode (decisions.md 2026-11-03): the lobby has no unread signal, so a panel
 * that started collapsed would hide every line until the player opened it. Collapsing sets
 * `hidden` on the body and keeps `ChatLog` mounted, so the transcript, its scroll position and an
 * unsent draft survive (`ChatLog` resticks a reader to the bottom when the body shows). The
 * section has no accessible name on purpose: a named section is a region "Chat", and the
 * transcript's `ScrollArea` already is one. The client filters nothing: `view.chatMessages` is the
 * recipient's own stream (golden rule 4). L76-13. L76-14: `locked` (reconnecting, A.9 ruling 6)
 * reaches `ChatLog` as `sendLocked`, so Send and Enter send nothing and the draft stays; `canWrite`
 * stays true, because hiding the composer would drop the draft.
 */

import type { LobbyStateView } from '@card-battle/shared';
import { useId, useState, type ReactElement } from 'react';

import { ChatLog } from '../../ui/chat/chat-log';
import { CHAT_LOG_LABEL } from '../../ui/chat/chat-line';
import { Icon } from '../../ui/icons/icon';
import { CHROME_FOCUS_CLASS, CHROME_SHAPE_CLASS } from '../../ui/primitives/chrome-classes';
import { WALK_IN_CHAT_LABEL } from './lobby-copy';

export interface LobbyChatPanelProps {
  readonly view: LobbyStateView;
  /** Reconnecting: Send and Enter send nothing and the draft stays (`ChatLog sendLocked`). */
  readonly locked: boolean;
  readonly onSendChat: (body: string) => void;
}

export function LobbyChatPanel({ view, locked, onSendChat }: LobbyChatPanelProps): ReactElement {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const walkIn = view.isSpectator === true;

  return (
    <section data-lobby-chat className={`${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}>
      <h2 className="font-v7-display text-v7-title leading-none text-v7-text">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            setOpen((current) => !current);
          }}
          className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-v7-chrome-sm text-left ${CHROME_FOCUS_CLASS}`}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="chat" className="shrink-0" />
            {CHAT_LOG_LABEL}
          </span>
          <Icon name="chevron-right" className={open ? 'shrink-0 rotate-90' : 'shrink-0'} />
        </button>
      </h2>
      <div id={bodyId} hidden={!open} className="mt-2">
        <ChatLog
          messages={view.chatMessages ?? []}
          players={view.players}
          canWrite
          onSend={onSendChat}
          sendLocked={locked}
          {...(walkIn ? { inputLabel: WALK_IN_CHAT_LABEL, placeholder: WALK_IN_CHAT_LABEL } : {})}
        />
      </div>
    </section>
  );
}
