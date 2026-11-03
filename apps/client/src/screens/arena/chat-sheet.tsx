/**
 * The chat sheet — technical spec v7 §6.1 item 1 and §6.9; Appendix A `table-chat-popup`,
 * `table-chat`, `table-chat-side-stream-disclosure`, `end-finished-chat-readonly`; L74-16.
 *
 * A read-only bottom `Sheet` hosted by the arena's sheets reducer (`{ kind: 'chat' }`) around the L72
 * `ChatLog`, which owns the round stamps, the side-line labels, the 16 px `Message` field, the
 * length cap, Enter / Send, the whitespace drop and the newest-line scroll. It has no actions and no
 * Close button (§6.7: Esc, backdrop, swipe-down). The `Sheet` sizes to the visual viewport, so the
 * field stays above a phone keyboard.
 *
 * Chat is an App-level action, not an `ArenaIntent` (plan Appendix A.6): `onSend` is
 * `props.onSendChat`, called directly and never through the commit helper. The finished board
 * (`readOnly`) keeps the transcript and drops the composer (rules spec §6 Chat).
 */

import type { PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { CHAT_LOG_LABEL } from '../../ui/chat/chat-line';
import { ChatLog } from '../../ui/chat/chat-log';
import { Sheet } from '../../ui/primitives/sheet';
import { arenaSheetKey } from './arena-sheets';

export interface ChatSheetProps {
  open: boolean;
  view: PlayingStateView;
  /** The finished board: no composer (rules spec §6 Chat). */
  readOnly: boolean;
  /** `props.onSendChat`: an App-level action, outside the commit helper. */
  onSend: (body: string) => void;
  onClose: () => void;
}

export function ChatSheet({ open, view, readOnly, onSend, onClose }: ChatSheetProps): ReactElement {
  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      title={CHAT_LOG_LABEL}
      onClose={onClose}
      dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'chat' }) }}
    >
      <ChatLog messages={view.chatMessages ?? []} players={view.players} canWrite={!readOnly} onSend={onSend} />
    </Sheet>
  );
}
