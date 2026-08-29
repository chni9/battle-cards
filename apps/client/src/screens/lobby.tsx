/**
 * Lobby screen — technical spec v2 §6, L11-02; bot controls L17-02 / technical spec v3 §6.
 * Seats, copyable game code, host Start / bot controls; same intents as V1 + L15 bot messages.
 */

import {
  BOT_DIFFICULTIES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PROTOCOL_VERSION,
  type BotDifficulty,
  type LobbyKitSelection,
  type LobbyStateView,
} from '@card-battle/shared';
import { useCallback, useState, type ReactElement } from 'react';

import { formatBotDifficulty } from '../bots/format-bot-difficulty';
import { BotSeatLabel } from '../design/components/bot-seat-label';
import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { KitPortrait } from '../design/components/kit-portrait';
import type { RoomConnectionStatus } from '../net/use-room-connection';
import { LobbyKitPickerDialog } from './lobby-kit-picker-dialog';
import { lobbyKitSelectionLabel } from './lobby-kit-picker';
import { STATUS_LABELS } from './status-labels';

export interface LobbyScreenProps {
  view: LobbyStateView;
  status: RoomConnectionStatus;
  error: string | null;
  onStart: () => void;
  onLeave: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
  onRemoveBot: (playerId: string) => void;
  onSetBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
  onChooseKit: (selection: LobbyKitSelection) => void;
}

export function LobbyScreen({
  view,
  status,
  error,
  onStart,
  onLeave,
  onAddBot,
  onRemoveBot,
  onSetBotDifficulty,
  onChooseKit,
}: LobbyScreenProps): ReactElement {
  const isHost = view.hostPlayerId === view.you;
  const canLaunch = isHost && view.players.length >= MIN_PLAYERS;
  const canAddBot = isHost && view.players.length < MAX_PLAYERS;
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [addDifficulty, setAddDifficulty] = useState<BotDifficulty>('normal');
  const [kitPickerOpen, setKitPickerOpen] = useState(false);

  const closeCopyDialog = useCallback(() => {
    setCopyOpen(false);
  }, []);

  const onCopyCode = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(view.gameCode);
        setCopyFailed(false);
        setCopyOpen(true);
      } catch {
        setCopyFailed(true);
        setCopyOpen(true);
      }
    })();
  }, [view.gameCode]);

  return (
    <main className="min-h-[100dvh] bg-surface font-sans text-ink">
      <div className="mx-auto max-w-lg px-4 py-8 md:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
          Lobby
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Card Battle</h1>
        <p className="mt-2 text-xs text-ink-muted">Protocol v{PROTOCOL_VERSION}</p>
        <p className="mt-1 text-sm text-ink-muted">{STATUS_LABELS[status]}</p>
        {error !== null && (
          <p className="mt-2 text-sm font-medium text-cta-red" role="alert">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-medium text-ink-muted">Game code</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-sans text-2xl font-semibold tracking-[0.2em] text-ink">
              {view.gameCode}
            </p>
            <Button type="button" variant="orange" onClick={onCopyCode}>
              Copy
            </Button>
          </div>
          {isHost && (
            <p className="mt-2 text-sm text-ink-muted">You are the host</p>
          )}
        </section>

        <section className="mt-6 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-medium text-ink-muted">Your kit</h2>
          <p className="mt-1 text-sm text-ink-muted">Hidden from opponents until Spy or death.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <KitPortrait
              kitId={view.yourKitSelection === 'random' ? null : view.yourKitSelection}
              nickname="Random kit"
              className="w-16"
            />
            <div className="min-w-0 space-y-2">
              <p className="font-medium text-ink">{lobbyKitSelectionLabel(view.yourKitSelection)}</p>
              <Button
                type="button"
                variant="orange"
                onClick={() => {
                  setKitPickerOpen(true);
                }}
              >
                Choose kit
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-ink">
            Players ({view.players.length}/{MAX_PLAYERS})
          </h2>
          <ul className="mt-3 divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
            {view.players.map((player) => (
              <li
                key={player.id}
                className="flex min-h-11 flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">
                    {player.nickname}
                    {player.id === view.you ? ' (you)' : ''}
                  </span>
                  {player.id === view.hostPlayerId && (
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                      Host
                    </span>
                  )}
                  {player.isBot && player.botDifficulty !== undefined && (
                    <BotSeatLabel difficulty={player.botDifficulty} />
                  )}
                </div>
                {isHost && player.isBot && player.botDifficulty !== undefined && (
                  <div className="flex flex-wrap gap-2">
                    {BOT_DIFFICULTIES.map((tier) => (
                      <Button
                        key={tier}
                        type="button"
                        variant={player.botDifficulty === tier ? 'green' : 'orange'}
                        onClick={() => {
                          onSetBotDifficulty(player.id, tier);
                        }}
                      >
                        {formatBotDifficulty(tier)}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="red"
                      onClick={() => {
                        onRemoveBot(player.id);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {isHost && (
          <section className="mt-6 space-y-3">
            <h2 className="text-sm font-medium text-ink">Add bot</h2>
            <div className="flex flex-wrap gap-2">
              {BOT_DIFFICULTIES.map((tier) => (
                <Button
                  key={tier}
                  type="button"
                  variant={addDifficulty === tier ? 'green' : 'orange'}
                  disabled={!canAddBot}
                  onClick={() => {
                    setAddDifficulty(tier);
                  }}
                >
                  {formatBotDifficulty(tier)}
                </Button>
              ))}
              <Button
                type="button"
                variant="green"
                disabled={!canAddBot}
                onClick={() => {
                  onAddBot(addDifficulty);
                }}
              >
                Add bot
              </Button>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {isHost && (
            <Button type="button" variant="green" disabled={!canLaunch} onClick={onStart}>
              Start game
            </Button>
          )}
          {!isHost && (
            <p className="self-center text-sm text-ink-muted">
              Waiting for the host to start…
            </p>
          )}
          <Button type="button" variant="red" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>

      <Dialog
        open={copyOpen}
        title={copyFailed ? 'Copy failed' : 'Code copied'}
        onClose={closeCopyDialog}
        actions={
          <Button type="button" variant="green" onClick={closeCopyDialog}>
            OK
          </Button>
        }
      >
        {copyFailed
          ? `Could not copy automatically. Game code: ${view.gameCode}`
          : `Share this code with friends: ${view.gameCode}`}
      </Dialog>

      <LobbyKitPickerDialog
        open={kitPickerOpen}
        current={view.yourKitSelection}
        onClose={() => {
          setKitPickerOpen(false);
        }}
        onSelect={onChooseKit}
      />
    </main>
  );
}
