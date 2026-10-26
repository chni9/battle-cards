/**
 * `/dev/ui` section for the L72-14 chat transcript and composer (technical spec v7 §4.2, §6.9,
 * §7.5): the living and side streams, the empty state, the finished board without a composer,
 * and the longest line a player can send. The message text is DEV-only demo copy. DEV only.
 *
 * No PascalCase local component lives here: `react-refresh/only-export-components` would report
 * the `gallery` export beside one. The frame is a plain function that returns JSX.
 */

import { CHAT_BODY_MAX_LENGTH, type ChatMessageView } from '@card-battle/shared';
import type { ReactElement } from 'react';
import type { GallerySection } from '../../dev/gallery-registry';
import { ChatLog } from './chat-log';

const PLAYERS = [{ id: 'p-ana' }, { id: 'p-bo' }];

const LOBBY_LIVING: ChatMessageView = { order: 1, senderId: 'p-ana', nickname: 'Ana', role: 'living', body: 'gl hf', round: 0 };
const ROUND_3_SEAT_1: ChatMessageView = { order: 2, senderId: 'p-bo', nickname: 'Bo', role: 'living', body: 'watch out', round: 3 };
const ELIMINATED: ChatMessageView = { order: 3, senderId: 'p-ana', nickname: 'Ana', role: 'eliminated', body: 'gg', round: 4 };
const UNKNOWN_SPECTATOR: ChatMessageView = { order: 4, senderId: 'walk-in', nickname: 'Cy', role: 'spectator', body: 'hi', round: 4 };
// A 24-character nickname is the longest the Home field allows; the body is the 200-character cap with no space to break at.
const LONGEST_LINE: ChatMessageView = {
  order: 5,
  senderId: 'p-bo',
  nickname: 'W'.repeat(24),
  role: 'living',
  body: 'Ha'.repeat(CHAT_BODY_MAX_LENGTH / 2),
  round: 12,
};

const noop = (): void => undefined;

/** The width of the chat sheet and lobby panel: a phone column, so wrapping is visible here. */
function frame(children: ReactElement): ReactElement {
  return <div className="max-w-md">{children}</div>;
}

export const gallery: GallerySection = {
  id: 'chat',
  title: 'Chat',
  entries: [
    {
      id: 'transcript',
      title: 'Transcript, living and side streams',
      render: () =>
        frame(
          <ChatLog
            messages={[LOBBY_LIVING, ROUND_3_SEAT_1, ELIMINATED, UNKNOWN_SPECTATOR]}
            players={PLAYERS}
            canWrite
            onSend={noop}
          />,
        ),
    },
    {
      id: 'empty',
      title: 'Empty',
      render: () => frame(<ChatLog messages={[]} players={PLAYERS} canWrite onSend={noop} />),
    },
    {
      id: 'read-only',
      title: 'Read only (finished board)',
      render: () =>
        frame(<ChatLog messages={[LOBBY_LIVING, ROUND_3_SEAT_1, ELIMINATED]} players={PLAYERS} canWrite={false} onSend={noop} />),
    },
    {
      id: 'longest-line',
      title: 'Longest nickname and body wrap inside the box',
      render: () => frame(<ChatLog messages={[LONGEST_LINE]} players={PLAYERS} canWrite onSend={noop} />),
    },
  ],
};
