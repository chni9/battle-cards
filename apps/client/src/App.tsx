/**
 * Phase router — Home / Lobby / Table / End / Admin.
 * Conventions: docs/agent/frontend.md · technical spec v2 §6 · L17-01 solo skip-lobby.
 * Admin is pathname `/admin` (Lot 61); `/inbox` redirects to `/admin/feedback`.
 * `/dev/ui` is the DEV-only V7 component gallery (technical spec v7 §4.2): it is lazily
 * imported behind `import.meta.env.DEV`, so production builds carry no gallery chunk.
 * The playing table follows the temporary `?ui=next` switch (technical spec v7 §4.4 / L72-20,
 * removed in L75); tutorial rooms always keep the classic table.
 */

import { defaultLobbyRules } from '@card-battle/shared';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { isDevUiRoute } from './dev/dev-ui-route';
import { useRoomConnection } from './net/use-room-connection';
import { AdminApp } from './screens/admin/admin-app';
import { ArenaScreen } from './screens/arena/arena-screen';
import { forgetChatSeen } from './screens/arena/chat-unread-store';
import { ClaimSeatDialog } from './screens/claim-seat-dialog';
import { claimStayLabel, shouldShowClaimPicker } from './screens/claim-seat';
import { EndScreen } from './screens/end';
import { HomeScreen } from './screens/home';
import { LobbyScreen } from './screens/lobby';
import { soloMenuSeed, type SoloMenuSeed } from './screens/solo-menu-seed';
import { STATUS_LABELS } from './screens/status-labels';
import { TableScreen, type TableScreenProps } from './screens/table';
import {
  applyUiSwitchParam,
  browserUiSwitchStorage,
  parseUiSwitchParam,
  resolveTableUi,
} from './ui-switch';
import { useLobbyRulesCache } from './use-lobby-rules-cache';
import { cachedLobbyRules } from './view-model/rules-recall';

const UiGallery = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./dev/ui-gallery')).UiGallery }))
  : null;

export function App() {
  const path = window.location.pathname;
  if (path === '/inbox' || path.startsWith('/inbox/')) {
    window.location.replace('/admin/feedback');
    return null;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminApp />;
  }
  if (isDevUiRoute(path, import.meta.env.DEV) && UiGallery !== null) {
    return (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    );
  }
  return <GameApp />;
}

function GameApp() {
  const connection = useRoomConnection();
  const {
    status,
    view,
    error,
    actionReject,
    soloLaunchPending,
    createGame,
    joinGame,
    leaveGame,
    forfeit,
    clearActionReject,
    startGame,
    startSoloGame,
    startTutorialGame,
    addBot,
    kickPlayer,
    setReady,
    playAgain,
    claimSeat,
    staySpectating,
    setBotDifficulty,
    chooseKit,
    setLobbyRules,
    sendChat,
    drawCard,
    playCard,
    playMultipleAttacks,
    resolveSubChoice,
    buyCard,
    sellCard,
    upgradeCard,
    buyUpgradePoint,
    buySpecialCard,
    buyPoolCard,
    clearSpy,
    sellUpgradePoint,
    deactivatePersistent,
    activateDuplication,
    lastTurnStarted,
    lastActionResolved,
    subChoice,
  } = connection;
  // This room's last lobby rules (L74-21, spec v7 §6.10, §6.11): the playing view carries none.
  const lobbyRulesCache = useLobbyRulesCache(view);
  // Every leave forgets them: a null view alone keeps them (`nextRulesCache`).
  const leave = (): void => {
    lobbyRulesCache.clear();
    void leaveGame();
  };
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [claimDismissedKey, setClaimDismissedKey] = useState<string | null>(null);
  const [pendingSoloMenu, setPendingSoloMenu] = useState<SoloMenuSeed | null>(null);
  // Once per page load, never per 250 ms tick: ?ui= writes or clears the stored choice.
  const [tablePreference] = useState(() =>
    applyUiSwitchParam(parseUiSwitchParam(window.location.search), browserUiSwitchStorage()),
  );

  const claimableSeats = view?.claimableSeats ?? [];
  const claimableKey = claimableSeats.map((seat) => seat.playerId).join('|');
  const walkInSpectator = view?.isSpectator === true;
  const youAreHost = view?.phase === 'lobby' && view.hostPlayerId === view.you;
  const showClaimPicker =
    view !== null &&
    shouldShowClaimPicker({
      claimableCount: claimableSeats.length,
      isSpectator: walkInSpectator,
      phase: view.phase,
      youAreHost,
    }) &&
    claimDismissedKey !== claimableKey;
  const claimPlayerIds = useMemo(
    () => (view === null ? [] : view.players.map((player) => player.id)),
    [view],
  );

  // A room back in its lobby starts its next match with the chat lines it holds already seen (V7 arena,
  // `chat-unread-store.ts`, L74-16 carry-forward). An effect, so it runs once the lobby has rendered and
  // no arena is mounted: a mounted arena hook would seed the count again at once. Keyed on the phase
  // and the code, so every return to the lobby, Play again included, forgets it once.
  const lobbyGameCode = view?.phase === 'lobby' ? view.gameCode : null;
  useEffect(() => {
    if (lobbyGameCode !== null) {
      forgetChatSeen(lobbyGameCode);
    }
  }, [lobbyGameCode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const claimDialog =
    view !== null && showClaimPicker ? (
      <ClaimSeatDialog
        open
        seats={claimableSeats}
        playerIds={claimPlayerIds}
        stayLabel={claimStayLabel({
          isSpectator: walkInSpectator,
          phase: view.phase,
        })}
        {...(view.phase === 'lobby' ? { hostPlayerId: view.hostPlayerId } : {})}
        onClaim={(playerId) => {
          claimSeat(playerId);
        }}
        onStay={() => {
          if (walkInSpectator) {
            staySpectating();
          }
          setClaimDismissedKey(claimableKey);
        }}
      />
    ) : null;

  if (view?.phase === 'finished') {
    return (
      <>
        <EndScreen
          view={view}
          actionReject={actionReject}
          onDismissActionReject={clearActionReject}
          statusLabel={STATUS_LABELS[status]}
          nowMs={nowMs}
          tableUi={resolveTableUi({ preference: tablePreference, playKind: view.playKind })}
          onLeave={leave}
          {...(view.playKind === 'classic' && !walkInSpectator
            ? {
                onPlayAgain: () => {
                  // One human seat reopens the solo menu. Two humans reform the lobby.
                  const seed = soloMenuSeed({
                    playKind: view.playKind,
                    ...(view.isSpectator === true ? { isSpectator: true as const } : {}),
                    players: view.players,
                    kitId: view.finalTable.self.kitId,
                    lobbyRules: view.lobbyRules ?? defaultLobbyRules(),
                  });
                  if (seed !== null) {
                    setPendingSoloMenu(seed);
                    leave();
                    return;
                  }
                  playAgain();
                },
              }
            : {})}
        />
        {claimDialog}
      </>
    );
  }

  if (view?.phase === 'playing') {
    const boardProps: TableScreenProps = {
      view,
      actionReject,
      onDismissActionReject: clearActionReject,
      statusLabel: STATUS_LABELS[status],
      nowMs,
      deadlineMs: lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs,
      lastActionResolved,
      subChoice,
      onDraw: drawCard,
      onPlayCard: playCard,
      onPlayMultipleAttacks: playMultipleAttacks,
      onResolveSubChoice: resolveSubChoice,
      onBuyCard: buyCard,
      onSellCard: sellCard,
      onUpgradeCard: upgradeCard,
      onBuyUpgradePoint: buyUpgradePoint,
      onBuySpecialCard: buySpecialCard,
      onBuyPoolCard: buyPoolCard,
      onClearSpy: clearSpy,
      onSellUpgradePoint: sellUpgradePoint,
      onDeactivatePersistent: deactivatePersistent,
      onActivateDuplication: activateDuplication,
      onLeave: leave,
      onForfeit: forfeit,
      onSendChat: sendChat,
    };
    return (
      <>
        {resolveTableUi({ preference: tablePreference, playKind: view.playKind }) === 'next' ? (
          <ArenaScreen
            {...boardProps}
            lastTurnStarted={lastTurnStarted}
            cachedLobbyRules={cachedLobbyRules(lobbyRulesCache.cache, view)}
          />
        ) : (
          <TableScreen {...boardProps} />
        )}
        {claimDialog}
      </>
    );
  }

  if (view?.phase === 'lobby' && !soloLaunchPending) {
    return (
      <>
        <LobbyScreen
          view={view}
          status={status}
          error={error}
          onStart={startGame}
          onLeave={leave}
          onAddBot={addBot}
          onKickPlayer={kickPlayer}
          onSetReady={setReady}
          onSetBotDifficulty={setBotDifficulty}
          onChooseKit={chooseKit}
          onSetLobbyRules={setLobbyRules}
          onSendChat={sendChat}
        />
        {claimDialog}
      </>
    );
  }

  return (
    <HomeScreen
      nickname={nickname}
      joinCode={joinCode}
      status={status}
      error={error}
      soloLaunchPending={soloLaunchPending}
      onNicknameChange={setNickname}
      onJoinCodeChange={setJoinCode}
      onCreate={() => {
        void createGame(nickname);
      }}
      onJoin={() => {
        void joinGame(joinCode, nickname);
      }}
      onStartSolo={(opponentCount, difficulty, kitSelection, rules) => {
        void startSoloGame({
          nickname,
          opponentCount,
          difficulty,
          kitSelection,
          lobbyRules: rules.lobbyRules,
          includeTurnTime: rules.includeTurnTime,
        });
      }}
      onStartTutorial={() => {
        void startTutorialGame(nickname);
      }}
      {...(pendingSoloMenu !== null
        ? {
            soloMenuSeed: pendingSoloMenu,
            onSoloMenuSeedApplied: () => {
              setPendingSoloMenu(null);
            },
          }
        : {})}
    />
  );
}
