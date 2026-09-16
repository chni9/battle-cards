/**
 * Phase router — Home / Lobby / Table / End / Admin.
 * Conventions: docs/agent/frontend.md · technical spec v2 §6 · L17-01 solo skip-lobby.
 * Admin is pathname `/admin` (Lot 61); `/inbox` redirects to `/admin/feedback`.
 */

import { useEffect, useMemo, useState } from 'react';

import { useRoomConnection } from './net/use-room-connection';
import { AdminApp } from './screens/admin/admin-app';
import { ClaimSeatDialog } from './screens/claim-seat-dialog';
import { claimStayLabel, shouldShowClaimPicker } from './screens/claim-seat';
import { EndScreen } from './screens/end';
import { HomeScreen } from './screens/home';
import { LobbyScreen } from './screens/lobby';
import { STATUS_LABELS } from './screens/status-labels';
import { TableScreen } from './screens/table';

export function App() {
  const path = window.location.pathname;
  if (path === '/inbox' || path.startsWith('/inbox/')) {
    window.location.replace('/admin/feedback');
    return null;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminApp />;
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
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [claimDismissedKey, setClaimDismissedKey] = useState<string | null>(null);

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
          onLeave={() => {
            void leaveGame();
          }}
          {...(view.playKind === 'classic' && !walkInSpectator
            ? {
                onPlayAgain: () => {
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
    return (
      <>
        <TableScreen
          view={view}
          actionReject={actionReject}
          onDismissActionReject={clearActionReject}
          statusLabel={STATUS_LABELS[status]}
          nowMs={nowMs}
          deadlineMs={lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs}
          lastActionResolved={lastActionResolved}
          subChoice={subChoice}
          onDraw={drawCard}
          onPlayCard={playCard}
          onPlayMultipleAttacks={playMultipleAttacks}
          onResolveSubChoice={resolveSubChoice}
          onBuyCard={buyCard}
          onSellCard={sellCard}
          onUpgradeCard={upgradeCard}
          onBuyUpgradePoint={buyUpgradePoint}
          onBuySpecialCard={buySpecialCard}
          onBuyPoolCard={buyPoolCard}
          onClearSpy={clearSpy}
          onSellUpgradePoint={sellUpgradePoint}
          onDeactivatePersistent={deactivatePersistent}
          onActivateDuplication={activateDuplication}
          onLeave={() => {
            void leaveGame();
          }}
          onForfeit={forfeit}
        />
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
          onLeave={() => {
            void leaveGame();
          }}
          onAddBot={addBot}
          onKickPlayer={kickPlayer}
          onSetReady={setReady}
          onSetBotDifficulty={setBotDifficulty}
          onChooseKit={chooseKit}
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
      onStartSolo={(opponentCount, difficulty, kitSelection) => {
        void startSoloGame({ nickname, opponentCount, difficulty, kitSelection });
      }}
      onStartTutorial={() => {
        void startTutorialGame(nickname);
      }}
    />
  );
}
