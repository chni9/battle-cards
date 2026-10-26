/**
 * `/dev/ui` section for the L72-19 seat labels (technical spec v7 §4.2): `PlayerName` at all
 * eight seats, `BotSeatLabel` at every difficulty and `ConnectionBadge` in every state. Each
 * sample sits on a `--panel` and on a `--panel-2` ground, the two surfaces a seat name may
 * stand on (§5.1: seat hues are never set straight on `.v7-ground`, whose halos can drop a hue
 * below 4.5:1). The long-name samples sit in a narrow frame so the truncating and the wrapping
 * forms show at any viewport width. The captions are DEV-only demo copy. DEV only.
 *
 * No PascalCase local component lives here: `react-refresh/only-export-components` would report
 * the `gallery` export beside one. The frames are plain functions that return JSX.
 */

import { BOT_DIFFICULTIES } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';
import type { GallerySection } from '../../dev/gallery-registry';
import { BotSeatLabel } from './bot-seat-label';
import { ConnectionBadge } from './connection-badge';
import type { ConnectionBadgePlayer } from './connection-badge-label';
import { PlayerName } from './player-name';

type Ground = 'panel' | 'panel-2';

const GROUNDS: readonly Ground[] = ['panel', 'panel-2'];
const GROUND_CLASS: Readonly<Record<Ground, string>> = { panel: 'bg-v7-panel', 'panel-2': 'bg-v7-panel-2' };
const CAPTION_CLASS = 'font-v7-body text-v7-caption font-bold text-v7-text-2';

/** One sample per ground, each captioned with its token so the designer reads the contrast pair. */
function onGrounds(sample: (ground: Ground) => ReactNode): ReactElement {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3">
      {GROUNDS.map((ground) => (
        <div key={ground} className={`flex min-w-0 flex-col gap-2 rounded-v7-chrome-sm p-3 ${GROUND_CLASS[ground]}`}>
          <p className={CAPTION_CLASS}>{`On --${ground}`}</p>
          {sample(ground)}
        </div>
      ))}
    </div>
  );
}

function labelled(label: string, sample: ReactNode): ReactElement {
  return (
    <div key={label} className="flex min-w-0 flex-col items-start gap-1">
      {sample}
      <p className={CAPTION_CLASS}>{label}</p>
    </div>
  );
}

const SEAT_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function seat(
  connection: Partial<ConnectionBadgePlayer['connection']>,
  isEliminated = false,
): ConnectionBadgePlayer {
  return {
    isEliminated,
    connection: { status: 'connected', automaticTurnsTaken: 0, consecutiveTimeouts: 0, ...connection },
  };
}

const GRACE_SEAT = seat({ status: 'disconnected' });

const BADGE_SEATS: readonly { label: string; seat: ConnectionBadgePlayer }[] = [
  { label: 'eliminated seat', seat: seat({}, true) },
  { label: 'reconnect grace', seat: GRACE_SEAT },
  { label: 'absent, 2 automatic turns', seat: seat({ status: 'absent', automaticTurnsTaken: 2 }) },
  { label: 'connected, 4 timeouts', seat: seat({ consecutiveTimeouts: 4 }) },
  { label: 'connected: no badge', seat: seat({}) },
];

const LONG_UNBROKEN = 'Wolfeschlegelsteinhausenbergerdorff';
const LONG_WORDS = 'Bartholomew the Unbeatable Card Shark';

export const gallery: GallerySection = {
  id: 'seat',
  title: 'Seat',
  entries: [
    {
      id: 'player-name-seats',
      title: 'PlayerName: the eight seat hues',
      render: () =>
        onGrounds((ground) => (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-v7-body">
            {SEAT_INDEXES.map((index) => (
              <PlayerName key={index} nickname={`${ground === 'panel' ? 'Seat' : 'Player'} ${String(index)}`} seatIndex={index} />
            ))}
          </div>
        )),
    },
    {
      id: 'player-name-forms',
      title: 'PlayerName: possessive, no seat, long names',
      render: () =>
        onGrounds((ground) => (
          <div className="flex min-w-0 flex-col gap-3 text-v7-body text-v7-text">
            {ground === 'panel' ? (
              <>
                {labelled('possessive: only the nickname is colored', <span><PlayerName nickname="Ana" seatIndex={0} possessive /></span>)}
                {labelled('no seat: the surrounding color', <PlayerName nickname="Unknown" />)}
              </>
            ) : null}
            <div className="flex w-full max-w-60 min-w-0 flex-col gap-3">
              {labelled(
                'long, truncated (className="truncate")',
                <div className="flex w-full min-w-0 items-center gap-1">
                  <PlayerName nickname={LONG_UNBROKEN} seatIndex={4} className="truncate" />
                  <ConnectionBadge player={GRACE_SEAT} className="shrink-0" />
                </div>,
              )}
              {labelled(
                'long, wrapped (wrap-anywhere)',
                <p className="min-w-0 wrap-anywhere">
                  <PlayerName nickname={LONG_WORDS} seatIndex={6} possessive />{' '}
                  <PlayerName nickname={LONG_UNBROKEN} seatIndex={1} />
                </p>,
              )}
            </div>
          </div>
        )),
    },
    {
      id: 'bot-seat-label',
      title: 'BotSeatLabel: every difficulty',
      render: () =>
        onGrounds(() => (
          <div className="flex flex-wrap gap-2">
            {BOT_DIFFICULTIES.map((difficulty) => (
              <BotSeatLabel key={difficulty} difficulty={difficulty} />
            ))}
          </div>
        )),
    },
    {
      id: 'connection-badge',
      title: 'ConnectionBadge: every state',
      render: () =>
        onGrounds(() => (
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {BADGE_SEATS.map(({ label, seat }) =>
              labelled(
                label,
                // A seat with no badge renders nothing, so the cell keeps a badge's height and its caption stays level.
                <div className="min-h-6">
                  <ConnectionBadge player={seat} />
                </div>,
              ),
            )}
          </div>
        )),
    },
  ],
};
