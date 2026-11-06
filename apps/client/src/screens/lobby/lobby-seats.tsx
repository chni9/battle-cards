/**
 * The lobby seats as a mini arena (technical spec v7 §7.2; §11 Q25, the seat hue is the
 * `view.players` index). Parity `lobby-player-list`, `lobby-add-bot`, `lobby-host-seat-kick`.
 *
 * One `--panel-2` card per seat, in view order: the Ready / Not ready mark (`check` / `close`,
 * by shape and name, never color alone), the avatar and nickname in the seat hue, ' (you)', the
 * Host tag and the bot label for every recipient. No seat renders a kit. The host gets a bot
 * difficulty control and Kick (which opens `KickConfirmDialog`) on every other seat, and the Add
 * bot row under the list. `locked` (reconnecting, wired by L76-14) disables every intent
 * control and closes an open Kick confirm for good. Rows come from `lobby-seat-model.ts`. L76-12.
 */

import { ACTION_REJECT_MESSAGE, type BotDifficulty, type LobbyStateView } from '@card-battle/shared';
import { useId, useRef, useState, type ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { Avatar } from '../../ui/primitives/avatar';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS, CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { Segmented } from '../../ui/primitives/segmented';
import { BotSeatLabel } from '../../ui/seat/bot-seat-label';
import { PlayerName } from '../../ui/seat/player-name';
import { KickConfirmDialog } from './kick-confirm-dialog';
import {
  ADD_BOT_DIFFICULTY_LABEL,
  ADD_BOT_LABEL,
  BOT_DIFFICULTY_OPTIONS,
  botDifficultyLabel,
  KICK_LABEL,
  LOBBY_HOST_TAG,
  LOBBY_YOU_SUFFIX,
  lobbyPlayersHeading,
} from './lobby-copy';
import { lobbyCanAddBot, lobbySeatRows, type LobbySeatRow } from './lobby-seat-model';

export interface LobbySeatsProps {
  readonly view: LobbyStateView;
  /** Reconnecting (wired by L76-14): Add bot, every difficulty and Kick are disabled, and an open Kick confirm closes. */
  readonly locked: boolean;
  readonly onAddBot: (difficulty: BotDifficulty) => void;
  readonly onKickPlayer: (playerId: string) => void;
  readonly onSetBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
}

/** The Host tag wears the `BotSeatLabel` chip shape: 11 px, `--chrome-radius-sm`, on `--panel`. */
const HOST_TAG_CLASS =
  'rounded-v7-chrome-sm bg-v7-panel px-1.5 py-0.5 font-v7-body text-v7-micro font-extrabold uppercase tracking-wide text-v7-text-2';

export function LobbySeats({ view, locked, onAddBot, onKickPlayer, onSetBotDifficulty }: LobbySeatsProps): ReactElement {
  const headingId = useId();
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  // The Kick that opened the confirm. Safari does not focus a button on click, so the Dialog's focus
  // trap would have no opener; Cancel, Esc and the backdrop hand focus back (P2 critique b, L76-18).
  // Written and read only in handlers, never during render.
  const kickOpener = useRef<HTMLElement | null>(null);
  const [addDifficulty, setAddDifficulty] = useState<BotDifficulty>('normal');
  const rows = lobbySeatRows(view);
  const isHost = view.hostPlayerId === view.you;
  const canAdd = lobbyCanAddBot(view);

  // The confirm target: a seat that left, or a lock, closes the confirm for good (Review Focus 4).
  const kickRow = kickTargetId === null ? undefined : rows.find((row) => row.id === kickTargetId);
  if (kickTargetId !== null && (kickRow === undefined || locked)) setKickTargetId(null);
  const target = kickRow === undefined || locked ? null : { id: kickRow.id, nickname: kickRow.nickname };

  function seatCard(row: LobbySeatRow): ReactElement {
    const difficulty = row.canSetDifficulty ? row.botDifficulty : null;
    const tagged = row.isHost || row.botDifficulty !== null;
    return (
      <li
        key={row.id}
        data-lobby-seat={row.id}
        className={`${CHROME_SHAPE_SM_CLASS} flex min-w-0 flex-col gap-2 bg-v7-panel-2 p-2`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon name={row.isReady ? 'check' : 'close'} label={row.readyLabel} className="shrink-0" />
          {/* The name is already text, so the avatar is hidden (Lot 74 G3). */}
          <span aria-hidden="true" className="inline-flex shrink-0">
            <Avatar name={row.nickname} seatIndex={row.seatIndex} size="sm" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1">
              <PlayerName
                nickname={row.nickname}
                seatIndex={row.seatIndex}
                className="min-w-0 wrap-anywhere text-v7-title leading-tight"
              />
              {row.isYou ? <span className="font-v7-body text-v7-caption text-v7-text-2">{LOBBY_YOU_SUFFIX}</span> : null}
            </div>
            {tagged ? (
              <div className="flex flex-wrap items-center gap-1">
                {row.isHost ? <span className={HOST_TAG_CLASS}>{LOBBY_HOST_TAG}</span> : null}
                {row.botDifficulty !== null ? <BotSeatLabel difficulty={row.botDifficulty} /> : null}
              </div>
            ) : null}
          </div>
        </div>
        {row.canKick ? (
          <div className="flex flex-wrap items-center gap-2">
            {difficulty !== null ? (
              <Segmented<BotDifficulty>
                label={botDifficultyLabel(row.nickname)}
                options={BOT_DIFFICULTY_OPTIONS}
                value={difficulty}
                onChange={(next) => {
                  onSetBotDifficulty(row.id, next);
                }}
                disabled={locked}
              />
            ) : null}
            <Button
              variant="quiet"
              disabled={locked}
              focusableWhenDisabled
              onClick={(event) => {
                kickOpener.current = event.currentTarget;
                setKickTargetId(row.id);
              }}
            >
              {KICK_LABEL}
            </Button>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <>
      <section aria-labelledby={headingId} className={`@container ${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}>
        <h2 id={headingId} className="font-v7-display text-v7-title leading-none text-v7-text">
          {lobbyPlayersHeading(view.players.length)}
        </h2>
        <ol className="mt-3 grid grid-cols-1 gap-3 @min-[34rem]:grid-cols-2">{rows.map(seatCard)}</ol>
        {isHost ? (
          <div data-lobby-add-bot className="mt-3 flex flex-wrap items-start gap-2">
            <Segmented<BotDifficulty>
              label={ADD_BOT_DIFFICULTY_LABEL}
              options={BOT_DIFFICULTY_OPTIONS}
              value={addDifficulty}
              onChange={setAddDifficulty}
              disabled={locked || !canAdd}
            />
            {/* The reason is always a string, so a focused Add bot keeps its focus when the eighth seat lands (Lot 74 G9). */}
            <Button
              variant="secondary"
              disabled={locked || !canAdd}
              focusableWhenDisabled
              disabledReason={canAdd ? '' : ACTION_REJECT_MESSAGE['add-bot-room-full']}
              onClick={() => {
                onAddBot(addDifficulty);
              }}
            >
              {ADD_BOT_LABEL}
            </Button>
          </div>
        ) : null}
      </section>
      <KickConfirmDialog
        target={target}
        onCancel={() => {
          setKickTargetId(null);
          kickOpener.current?.focus();
        }}
        onConfirm={(playerId) => {
          setKickTargetId(null);
          onKickPlayer(playerId);
        }}
      />
    </>
  );
}
