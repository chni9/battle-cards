/**
 * Phase router — Home / Lobby / Table / End / Inbox.
 * Conventions: docs/agent/frontend.md · technical spec v2 §6 · L17-01 solo skip-lobby.
 * Inbox is pathname `/inbox`, not a game phase (technical spec v6 §7.3 / L47-05).
 */

import { useEffect, useState } from 'react';

import { useRoomConnection } from './net/use-room-connection';
import { EndScreen } from './screens/end';
import { HomeScreen } from './screens/home';
import { InboxScreen } from './screens/inbox';
import { LobbyScreen } from './screens/lobby';
import { STATUS_LABELS } from './screens/status-labels';
import { TableScreen } from './screens/table';

export function App() {
  if (window.location.pathname === '/inbox') {
    return <InboxScreen />;
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
    removeBot,
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

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  if (view?.phase === 'finished') {
    return (
      <EndScreen
        view={view}
        actionReject={actionReject}
        onDismissActionReject={clearActionReject}
        statusLabel={STATUS_LABELS[status]}
        nowMs={nowMs}
        onLeave={() => {
          void leaveGame();
        }}
      />
    );
  }

  if (view?.phase === 'playing') {
    return (
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
        onSellUpgradePoint={sellUpgradePoint}
        onDeactivatePersistent={deactivatePersistent}
        onActivateDuplication={activateDuplication}
        onLeave={() => {
          void leaveGame();
        }}
        onForfeit={forfeit}
      />
    );
  }

  if (view?.phase === 'lobby' && !soloLaunchPending) {
    return (
      <LobbyScreen
        view={view}
        status={status}
        error={error}
        onStart={startGame}
        onLeave={() => {
          void leaveGame();
        }}
        onAddBot={addBot}
        onRemoveBot={removeBot}
        onSetBotDifficulty={setBotDifficulty}
        onChooseKit={chooseKit}
      />
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
