/**
 * Lobby screen — technical spec v2 §6, L11-02; bot controls L17-02 / technical spec v3 §6.
 * Moved into `screens/lobby/` by L76-02 (technical spec v7 §4.2). L76-12 restyles it as a mini
 * arena on the V7 ground (§7.2, §5.1–§5.3, §11 Q25, Q39). In DOM order:
 * - the setup column: `LobbyHeader`, the table rules strip (the host edits, L76-09), `LobbyKitCard`;
 * - the table column: `LobbySeats`, then `LobbyChatPanel` (L76-13);
 * - `LobbyActions`, sticky at the bottom of `main`.
 * One column on a phone; from `lg`, two page columns (setup 26rem). `main` is the only scroll
 * container (no inner list scroll). Props are unchanged; the parts decide nothing (golden rule 8).
 */

import {
  defaultLobbyRules,
  type BotDifficulty,
  type LobbyKitSelection,
  type LobbyStateView,
  type SetLobbyRulesPayload,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { RulesStrip } from '../../ui/rules/rules-strip';
import { LobbyActions } from './lobby-actions';
import { LobbyChatPanel } from './lobby-chat-panel';
import { LobbyHeader } from './lobby-header';
import { LobbyKitCard } from './lobby-kit-card';
import { LobbySeats } from './lobby-seats';

export interface LobbyScreenProps {
  view: LobbyStateView;
  status: RoomConnectionStatus;
  error: string | null;
  onStart: () => void;
  onLeave: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
  onKickPlayer: (playerId: string) => void;
  onSetReady: (ready: boolean) => void;
  onSetBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
  onChooseKit: (selection: LobbyKitSelection) => void;
  onSetLobbyRules: (payload: SetLobbyRulesPayload) => void;
  onSendChat: (body: string) => void;
}

export function LobbyScreen({
  view,
  status,
  error,
  onStart,
  onLeave,
  onAddBot,
  onKickPlayer,
  onSetReady,
  onSetBotDifficulty,
  onChooseKit,
  onSetLobbyRules,
  onSendChat,
}: LobbyScreenProps): ReactElement {
  const isHost = view.hostPlayerId === view.you;
  const rules = view.lobbyRules ?? defaultLobbyRules();
  // Reconnect lock (plan A.4, ruling 6): L76-14 replaces this with lobbyIntentsLocked(status).
  const locked = false;

  return (
    <main className="v7-ground relative h-full overflow-y-auto overscroll-contain font-v7-body text-v7-text">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-4 px-4 pt-6 pb-3 lg:max-w-6xl lg:px-8">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div data-lobby-column="setup" className="flex min-w-0 flex-col gap-4">
            <LobbyHeader gameCode={view.gameCode} status={status} error={error} isHost={isHost} />
            <RulesStrip rules={rules} {...(isHost ? { editor: { onChange: onSetLobbyRules, disabled: locked } } : {})} />
            <LobbyKitCard
              selection={view.yourKitSelection}
              rules={rules}
              walkIn={view.isSpectator === true}
              isHost={isHost}
              locked={locked}
              onChooseKit={onChooseKit}
            />
          </div>
          <div data-lobby-column="table" className="flex min-w-0 flex-col gap-4">
            <LobbySeats
              view={view}
              locked={locked}
              onAddBot={onAddBot}
              onKickPlayer={onKickPlayer}
              onSetBotDifficulty={onSetBotDifficulty}
            />
            <LobbyChatPanel view={view} onSendChat={onSendChat} />
          </div>
        </div>
        <LobbyActions view={view} locked={locked} onStart={onStart} onSetReady={onSetReady} onLeave={onLeave} />
      </div>
    </main>
  );
}
