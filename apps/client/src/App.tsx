/**
 * Phase router — Home/Lobby/Table extracted; End still inline until Lot 13.
 * Conventions: docs/agent/frontend.md · technical spec v2 §6.
 */

import { useEffect, useState } from 'react';

import { Button } from './design/components/button';
import { ConnectionBadge } from './design/components/connection-badge';
import { useRoomConnection } from './net/use-room-connection';
import { HomeScreen } from './screens/home';
import { LobbyScreen } from './screens/lobby';
import { STATUS_LABELS } from './screens/status-labels';
import { TableScreen } from './screens/table';

export function App() {
  const connection = useRoomConnection();
  const {
    status,
    view,
    error,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    drawCard,
    playCard,
    playMultipleAttacks,
    chooseMirrorTarget,
    chooseEliminationReward,
    buyCard,
    sellCard,
    upgradeCard,
    buyUpgradePoint,
    buySpecialCard,
    sellUpgradePoint,
    lastTurnStarted,
    lastActionResolved,
    mirrorChoice,
    rewardChoice,
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
    const winner = view.players.find((player) => player.id === view.winnerPlayerId);
    const nick = (playerId: string): string =>
      view.players.find((player) => player.id === playerId)?.nickname ?? playerId;

    return (
      <main className="bg-surface p-4 font-sans text-ink">
        <h1 className="text-2xl font-semibold text-ink">Card Battle</h1>
        <h2>Game over</h2>
        <p>Winner: {winner?.nickname ?? view.winnerPlayerId}</p>
        <ul>
          {view.players.map((player) => (
            <li key={player.id}>
              {player.nickname}
              <ConnectionBadge player={player} />
            </li>
          ))}
        </ul>
        <section>
          <h3>Recap</h3>
          <p>Turns played: {view.recap.turnSequence}</p>
          <ul>
            {view.recap.players.map((row) => (
              <li key={row.playerId}>
                {nick(row.playerId)} — played {row.cardsPlayedCount}, bought {row.buyCount},
                sold {row.sellCount}, upgraded {row.upgradeCount}
              </li>
            ))}
          </ul>
          {view.recap.eliminations.length === 0 ? (
            <p>No eliminations</p>
          ) : (
            <ul>
              {view.recap.eliminations.map((entry) => (
                <li key={`${entry.playerId}-${entry.reason}`}>
                  {nick(entry.playerId)} eliminated ({entry.reason})
                  {entry.eliminatorPlayerId !== null
                    ? ` by ${nick(entry.eliminatorPlayerId)}`
                    : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
        <Button variant="red" onClick={() => void leaveGame()}>
          Return home
        </Button>
      </main>
    );
  }

  if (view?.phase === 'playing') {
    return (
      <TableScreen
        view={view}
        error={error}
        statusLabel={STATUS_LABELS[status]}
        nowMs={nowMs}
        deadlineMs={lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs}
        lastActionResolved={lastActionResolved}
        mirrorChoice={mirrorChoice}
        rewardChoice={rewardChoice}
        onDraw={drawCard}
        onPlayCard={playCard}
        onPlayMultipleAttacks={playMultipleAttacks}
        onChooseMirrorTarget={chooseMirrorTarget}
        onChooseEliminationReward={chooseEliminationReward}
        onBuyCard={buyCard}
        onSellCard={sellCard}
        onUpgradeCard={upgradeCard}
        onBuyUpgradePoint={buyUpgradePoint}
        onBuySpecialCard={buySpecialCard}
        onSellUpgradePoint={sellUpgradePoint}
        onLeave={() => {
          void leaveGame();
        }}
      />
    );
  }

  if (view?.phase === 'lobby') {
    return (
      <LobbyScreen
        view={view}
        status={status}
        error={error}
        onStart={startGame}
        onLeave={() => {
          void leaveGame();
        }}
      />
    );
  }

  return (
    <HomeScreen
      nickname={nickname}
      joinCode={joinCode}
      status={status}
      error={error}
      onNicknameChange={setNickname}
      onJoinCodeChange={setJoinCode}
      onCreate={() => {
        void createGame(nickname);
      }}
      onJoin={() => {
        void joinGame(joinCode, nickname);
      }}
    />
  );
}
