/**
 * Phase router — Home/Lobby extracted (L11); Table/End still inline until Lot 12/13.
 * Conventions: docs/agent/frontend.md · technical spec v2 §6.
 */

import {
  ATTACK_CARD_IDS,
  SHARED_CARD_IDS,
  getKit,
  type ActionResolvedPayload,
  type MirrorChoiceRequiredPayload,
  type PlayingStateView,
  type RewardChoice,
  type RewardChoiceRequiredPayload,
} from '@card-battle/shared';
import { useEffect, useState } from 'react';

import { ActionLogPanel } from './action-log/action-log-panel';
import { Button } from './design/components/button';
import { Card } from './design/components/card';
import { ConnectionBadge } from './design/components/connection-badge';
import { KitPortrait } from './design/components/kit-portrait';
import { ResourceIcon } from './design/components/resource-icon';
import { useRoomConnection, type PlayCardOptions } from './net/use-room-connection';
import { HomeScreen } from './screens/home';
import { LobbyScreen } from './screens/lobby';
import { STATUS_LABELS } from './screens/status-labels';

type RewardKind = RewardChoice['type'];

const REWARD_KINDS: readonly RewardKind[] = [
  'lives',
  'points',
  'upgradePoint',
  'card',
] as const;

function isAttackCardId(cardId: string): boolean {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
}


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
  const [targetId, setTargetId] = useState('');
  const [playInstanceId, setPlayInstanceId] = useState('');
  const [includeTarget, setIncludeTarget] = useState(true);
  const [playQuantity, setPlayQuantity] = useState(1);
  const [buyCardId, setBuyCardId] = useState<string>(SHARED_CARD_IDS[0]);
  const [sellInstanceId, setSellInstanceId] = useState('');
  const [upgradeInstanceId, setUpgradeInstanceId] = useState('');
  const [mirrorEffectId, setMirrorEffectId] = useState('');
  const [mirrorTargetId, setMirrorTargetId] = useState('');
  const [rewardKind1, setRewardKind1] = useState<RewardKind>('lives');
  const [rewardKind2, setRewardKind2] = useState<RewardKind>('points');
  const [rewardCard1, setRewardCard1] = useState('');
  const [rewardCard2, setRewardCard2] = useState('');
  const [multiAttackIds, setMultiAttackIds] = useState<string[]>([]);
  const [multiAttackTargets, setMultiAttackTargets] = useState<Record<string, string>>({});
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
    const nickname = (playerId: string): string =>
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
                {nickname(row.playerId)} — played {row.cardsPlayedCount}, bought {row.buyCount},
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
                  {nickname(entry.playerId)} eliminated ({entry.reason})
                  {entry.eliminatorPlayerId !== null
                    ? ` by ${nickname(entry.eliminatorPlayerId)}`
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
        targetId={targetId}
        setTargetId={setTargetId}
        playInstanceId={playInstanceId}
        setPlayInstanceId={setPlayInstanceId}
        includeTarget={includeTarget}
        setIncludeTarget={setIncludeTarget}
        playQuantity={playQuantity}
        setPlayQuantity={setPlayQuantity}
        buyCardId={buyCardId}
        setBuyCardId={setBuyCardId}
        sellInstanceId={sellInstanceId}
        setSellInstanceId={setSellInstanceId}
        upgradeInstanceId={upgradeInstanceId}
        setUpgradeInstanceId={setUpgradeInstanceId}
        mirrorChoice={mirrorChoice}
        mirrorEffectId={mirrorEffectId}
        setMirrorEffectId={setMirrorEffectId}
        mirrorTargetId={mirrorTargetId}
        setMirrorTargetId={setMirrorTargetId}
        rewardChoice={rewardChoice}
        rewardKind1={rewardKind1}
        setRewardKind1={setRewardKind1}
        rewardKind2={rewardKind2}
        setRewardKind2={setRewardKind2}
        rewardCard1={rewardCard1}
        setRewardCard1={setRewardCard1}
        rewardCard2={rewardCard2}
        setRewardCard2={setRewardCard2}
        onDraw={drawCard}
        onPlay={() => {
          if (playInstanceId === '') {
            return;
          }

          const selected =
            view.self.hand.find((card) => card.instanceId === playInstanceId) ??
            view.self.specialCards.find((card) => card.instanceId === playInstanceId);
          const options: PlayCardOptions = {
            ...(includeTarget && targetId !== '' ? { targetPlayerId: targetId } : {}),
            ...(selected?.cardId === 'regeneration' ? { quantity: playQuantity } : {}),
          };
          playCard(playInstanceId, options);
        }}
        onPlayMultipleAttacks={() => {
          if (multiAttackIds.length < 2) {
            return;
          }

          const attacks = multiAttackIds.flatMap((instanceId) => {
            const targetPlayerId = multiAttackTargets[instanceId];
            if (targetPlayerId === undefined || targetPlayerId === '') {
              return [];
            }

            return [{ instanceId, targetPlayerId }];
          });

          if (attacks.length !== multiAttackIds.length) {
            return;
          }

          playMultipleAttacks(attacks);
          setMultiAttackIds([]);
          setMultiAttackTargets({});
        }}
        multiAttackIds={multiAttackIds}
        setMultiAttackIds={setMultiAttackIds}
        multiAttackTargets={multiAttackTargets}
        setMultiAttackTargets={setMultiAttackTargets}
        onChooseMirror={() => {
          if (mirrorEffectId !== '' && mirrorTargetId !== '') {
            chooseMirrorTarget(mirrorEffectId, mirrorTargetId);
          }
        }}
        onChooseReward={() => {
          if (rewardChoice === null) {
            return;
          }

          const choice1 = buildRewardChoice(rewardKind1, rewardCard1);
          const choice2 = buildRewardChoice(rewardKind2, rewardCard2);
          if (choice1 === null || choice2 === null) {
            return;
          }

          chooseEliminationReward(rewardChoice.eliminationId, [choice1, choice2]);
        }}
        onBuy={() => {
          buyCard(buyCardId as (typeof SHARED_CARD_IDS)[number]);
        }}
        onSell={() => {
          if (sellInstanceId !== '') {
            sellCard(sellInstanceId);
          }
        }}
        onUpgrade={() => {
          if (upgradeInstanceId !== '') {
            upgradeCard(upgradeInstanceId);
          }
        }}
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

function TableScreen(props: {
  view: PlayingStateView;
  error: string | null;
  statusLabel: string;
  nowMs: number;
  deadlineMs: number | null;
  lastActionResolved: ActionResolvedPayload | null;
  targetId: string;
  setTargetId: (id: string) => void;
  playInstanceId: string;
  setPlayInstanceId: (id: string) => void;
  includeTarget: boolean;
  setIncludeTarget: (value: boolean) => void;
  playQuantity: number;
  setPlayQuantity: (value: number) => void;
  buyCardId: string;
  setBuyCardId: (id: string) => void;
  sellInstanceId: string;
  setSellInstanceId: (id: string) => void;
  upgradeInstanceId: string;
  setUpgradeInstanceId: (id: string) => void;
  mirrorChoice: MirrorChoiceRequiredPayload | null;
  mirrorEffectId: string;
  setMirrorEffectId: (id: string) => void;
  mirrorTargetId: string;
  setMirrorTargetId: (id: string) => void;
  rewardChoice: RewardChoiceRequiredPayload | null;
  rewardKind1: RewardKind;
  setRewardKind1: (kind: RewardKind) => void;
  rewardKind2: RewardKind;
  setRewardKind2: (kind: RewardKind) => void;
  rewardCard1: string;
  setRewardCard1: (id: string) => void;
  rewardCard2: string;
  setRewardCard2: (id: string) => void;
  onDraw: () => void;
  onPlay: () => void;
  onPlayMultipleAttacks: () => void;
  multiAttackIds: string[];
  setMultiAttackIds: (ids: string[]) => void;
  multiAttackTargets: Record<string, string>;
  setMultiAttackTargets: (targets: Record<string, string>) => void;
  onChooseMirror: () => void;
  onChooseReward: () => void;
  onBuy: () => void;
  onSell: () => void;
  onUpgrade: () => void;
  onBuyUpgradePoint: () => void;
  onBuySpecialCard: () => void;
  onSellUpgradePoint: () => void;
  onLeave: () => void;
}) {
  const {
    view,
    error,
    statusLabel,
    nowMs,
    deadlineMs,
    lastActionResolved,
    targetId,
    setTargetId,
    playInstanceId,
    setPlayInstanceId,
    includeTarget,
    setIncludeTarget,
    playQuantity,
    setPlayQuantity,
    buyCardId,
    setBuyCardId,
    sellInstanceId,
    setSellInstanceId,
    upgradeInstanceId,
    setUpgradeInstanceId,
    mirrorChoice,
    mirrorEffectId,
    setMirrorEffectId,
    mirrorTargetId,
    setMirrorTargetId,
    rewardChoice,
    rewardKind1,
    setRewardKind1,
    rewardKind2,
    setRewardKind2,
    rewardCard1,
    setRewardCard1,
    rewardCard2,
    setRewardCard2,
    onDraw,
    onPlay,
    onPlayMultipleAttacks,
    multiAttackIds,
    setMultiAttackIds,
    multiAttackTargets,
    setMultiAttackTargets,
    onChooseMirror,
    onChooseReward,
    onBuy,
    onSell,
    onUpgrade,
    onBuyUpgradePoint,
    onBuySpecialCard,
    onSellUpgradePoint,
    onLeave,
  } = props;

  const isMyTurn = view.currentTurnPlayerId === view.you;
  const selfEliminated =
    view.players.find((player) => player.id === view.you)?.isEliminated === true;
  // Lock while Mirror/reward sub-choice is up, or once this seat is eliminated (turn may
  // still point at the dead player until rewards finish — Lot 6 pause).
  const actionsLocked =
    rewardChoice !== null || mirrorChoice !== null || selfEliminated;
  const kit = getKit(view.self.kitId);
  const drawValue = kit.startingResources.draw;
  const allowsMultiAttack = kit.traits.allowsMultipleAttacksPerTurn;
  const attackCards = view.self.hand.filter((card) => isAttackCardId(card.cardId));
  const playableCards = [...view.self.hand, ...view.self.specialCards];
  const activePlayer = view.players.find(
    (player) => player.id === view.currentTurnPlayerId,
  );
  const activeStatus = activePlayer?.connection.status;
  const turnPaused =
    activeStatus === 'disconnected' ||
    (activeStatus === 'absent' && deadlineMs === null);
  const secondsLeft =
    deadlineMs === null || turnPaused
      ? null
      : Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  const timerLabel = turnPaused
    ? activeStatus === 'disconnected'
      ? 'Paused — reconnecting'
      : 'Absent — auto-draw'
    : secondsLeft === null
      ? '—'
      : `${secondsLeft}s`;
  const opponents = view.players.filter((player) => !player.isYou);
  const selectedPlayCard = playableCards.find((card) => card.instanceId === playInstanceId);
  const mirrorSecondsLeft =
    mirrorChoice === null
      ? null
      : Math.max(0, Math.ceil((mirrorChoice.deadlineMs - nowMs) / 1000));
  const rewardSecondsLeft =
    rewardChoice === null
      ? null
      : Math.max(0, Math.ceil((rewardChoice.deadlineMs - nowMs) / 1000));
  const eligibleMirrorEffects = view.pendingEffects.filter(
    (effect) => mirrorChoice?.eligibleEffectIds.includes(effect.id) ?? false,
  );

  useEffect(() => {
    if (targetId === '' && opponents[0] !== undefined) {
      setTargetId(opponents[0].id);
    }
  }, [opponents, setTargetId, targetId]);

  useEffect(() => {
    const playable = [...view.self.hand, ...view.self.specialCards];

    if (
      playInstanceId !== '' &&
      playable.some((card) => card.instanceId === playInstanceId)
    ) {
      return;
    }

    setPlayInstanceId(playable[0]?.instanceId ?? '');
  }, [playInstanceId, setPlayInstanceId, view.self.hand, view.self.specialCards]);

  useEffect(() => {
    if (
      sellInstanceId !== '' &&
      view.self.hand.some((card) => card.instanceId === sellInstanceId)
    ) {
      return;
    }

    setSellInstanceId(view.self.hand[0]?.instanceId ?? '');
  }, [sellInstanceId, setSellInstanceId, view.self.hand]);

  const upgradable = [...view.self.hand, ...view.self.specialCards].filter(
    (card) => !card.isUpgraded,
  );

  useEffect(() => {
    const candidates = [...view.self.hand, ...view.self.specialCards].filter(
      (card) => !card.isUpgraded,
    );
    const stillValid = candidates.some((card) => card.instanceId === upgradeInstanceId);

    if (stillValid) {
      return;
    }

    setUpgradeInstanceId(candidates[0]?.instanceId ?? '');
  }, [upgradeInstanceId, setUpgradeInstanceId, view.self.hand, view.self.specialCards]);

  useEffect(() => {
    if (mirrorChoice === null) {
      setMirrorEffectId('');
      return;
    }

    const first = mirrorChoice.eligibleEffectIds[0];
    if (first !== undefined && !mirrorChoice.eligibleEffectIds.includes(mirrorEffectId)) {
      setMirrorEffectId(first);
    }
  }, [mirrorChoice, mirrorEffectId, setMirrorEffectId]);

  useEffect(() => {
    if (mirrorTargetId === '' && opponents[0] !== undefined) {
      setMirrorTargetId(opponents[0].id);
    }
  }, [mirrorTargetId, opponents, setMirrorTargetId]);

  useEffect(() => {
    if (rewardChoice === null) {
      return;
    }

    const firstCard = rewardChoice.availableCards[0];
    const firstId = firstCard?.instanceId ?? '';
    const ids = rewardChoice.availableCards.map((card) => card.instanceId);

    if (rewardKind1 === 'card' && (rewardCard1 === '' || !ids.includes(rewardCard1))) {
      setRewardCard1(firstId);
    }
    if (rewardKind2 === 'card' && (rewardCard2 === '' || !ids.includes(rewardCard2))) {
      setRewardCard2(firstId);
    }
  }, [
    rewardCard1,
    rewardCard2,
    rewardChoice,
    rewardKind1,
    rewardKind2,
    setRewardCard1,
    setRewardCard2,
  ]);

  const rewardConfirmReady =
    buildRewardChoice(rewardKind1, rewardCard1) !== null &&
    buildRewardChoice(rewardKind2, rewardCard2) !== null;

  return (
    <main>
      <h1>Card Battle</h1>
      <p>
        Code {view.gameCode} · {statusLabel}
      </p>
      {error !== null && <p>{error}</p>}

      <section>
        <h2>Turn</h2>
        <p>
          Active:{' '}
          {view.players.find((player) => player.id === view.currentTurnPlayerId)?.nickname ??
            '—'}
          {isMyTurn ? ' (you)' : ''}
        </p>
        <p>Timer: {timerLabel}</p>
        {lastActionResolved?.outcome === 'immune' && (
          <p>
            {lastActionResolved.cardId} failed — target is immune
          </p>
        )}
      </section>

      {selfEliminated && (
        <section>
          <h2>Eliminated</h2>
          <p>You are a spectator. Actions are locked while rewards (if any) resolve.</p>
        </section>
      )}

      {mirrorChoice !== null && (
        <section>
          <h2>Mirror redirect</h2>
          <p>Choose which pending attack to redirect ({mirrorSecondsLeft ?? '—'}s left).</p>
          <label>
            Effect{' '}
            <select
              value={mirrorEffectId}
              onChange={(event) => {
                setMirrorEffectId(event.target.value);
              }}
            >
              {eligibleMirrorEffects.map((effect) => (
                <option key={effect.id} value={effect.id}>
                  {effect.cardId}
                  {effect.isUpgraded ? ' ↑' : ''} from{' '}
                  {nicknameOf(view, effect.sourcePlayerId)}
                </option>
              ))}
            </select>
          </label>
          <label>
            New target{' '}
            <select
              value={mirrorTargetId}
              onChange={(event) => {
                setMirrorTargetId(event.target.value);
              }}
            >
              {opponents
                .filter((player) => !player.isEliminated)
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.nickname}
                  </option>
                ))}
            </select>
          </label>
          <Button variant="green"
            disabled={mirrorEffectId === '' || mirrorTargetId === ''}
            onClick={onChooseMirror}
          >
            Confirm redirect
          </Button>
        </section>
      )}

      {rewardChoice !== null && (
        <section>
          <h2>Elimination reward</h2>
          <p>
            Pick two rewards from {nicknameOf(view, rewardChoice.eliminatedPlayerId)} (
            {rewardSecondsLeft ?? '—'}s left).
          </p>
          <div>
            <label>
              Choice 1{' '}
              <select
                value={rewardKind1}
                onChange={(event) => {
                  setRewardKind1(event.target.value as RewardKind);
                }}
              >
                {REWARD_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            {rewardKind1 === 'card' && (
              <label>
                Card{' '}
                <select
                  value={rewardCard1}
                  onChange={(event) => {
                    setRewardCard1(event.target.value);
                  }}
                >
                  {rewardChoice.availableCards.map((card) => (
                    <option key={card.instanceId} value={card.instanceId}>
                      {card.cardId} ({card.instanceId})
                      {card.isUpgraded ? ' ↑' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div>
            <label>
              Choice 2{' '}
              <select
                value={rewardKind2}
                onChange={(event) => {
                  setRewardKind2(event.target.value as RewardKind);
                }}
              >
                {REWARD_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            {rewardKind2 === 'card' && (
              <label>
                Card{' '}
                <select
                  value={rewardCard2}
                  onChange={(event) => {
                    setRewardCard2(event.target.value);
                  }}
                >
                  {rewardChoice.availableCards.map((card) => (
                    <option key={card.instanceId} value={card.instanceId}>
                      {card.cardId} ({card.instanceId})
                      {card.isUpgraded ? ' ↑' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <Button variant="green" disabled={!rewardConfirmReady} onClick={onChooseReward}>
            Confirm rewards
          </Button>
        </section>
      )}

      <section>
        <h2>Opponents</h2>
        <ul>
          {opponents.map((player) => (
            <li key={player.id}>
              <label>
                <input
                  type="radio"
                  name="target"
                  checked={targetId === player.id}
                  disabled={player.isEliminated}
                  onChange={() => {
                    setTargetId(player.id);
                  }}
                />
                {player.nickname}
                <ConnectionBadge player={player} />
              </label>
              {player.spied !== undefined && (
                <div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <KitPortrait
                      kitId={player.spied.kitId}
                      nickname={player.nickname}
                      isEliminated={player.isEliminated}
                    />
                    {player.spied.lives !== undefined ? (
                      <>
                        <ResourceIcon kind="life" value={player.spied.lives} />
                        <ResourceIcon kind="point" value={player.spied.points ?? 0} />
                        <ResourceIcon kind="upgradePoint" value={player.spied.upgradePoints ?? 0} />
                        <ResourceIcon kind="shield" value={player.spied.shield ?? 0} />
                      </>
                    ) : null}
                    {player.spied.resourcesSnapshot !== undefined ? (
                      <span className="text-xs text-ink-muted">
                        Snapshot turn {player.spied.resourcesSnapshot.turnSequence}:{' '}
                        <ResourceIcon kind="life" value={player.spied.resourcesSnapshot.lives} />{' '}
                        <ResourceIcon kind="point" value={player.spied.resourcesSnapshot.points} />{' '}
                        <ResourceIcon
                          kind="upgradePoint"
                          value={player.spied.resourcesSnapshot.upgradePoints}
                        />{' '}
                        <ResourceIcon kind="shield" value={player.spied.resourcesSnapshot.shield} />
                      </span>
                    ) : null}
                  </div>
                  <p>Hand:</p>
                  <div className="flex flex-wrap gap-2">
                    {player.spied.hand.map((card) => (
                      <Card key={card.instanceId} instance={card} />
                    ))}
                  </div>
                  {player.spied.specialCards.length > 0 && (
                    <>
                      <p>Specials:</p>
                      <div className="flex flex-wrap gap-2">
                        {player.spied.specialCards.map((card) => (
                          <Card key={card.instanceId} instance={card} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {player.spied === undefined && !player.isYou && (
                <div className="mt-1">
                  <KitPortrait
                    kitId={null}
                    nickname={player.nickname}
                    isEliminated={player.isEliminated}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Pending effects</h2>
        {view.pendingEffects.length === 0 ? (
          <p>None</p>
        ) : (
          <ul>
            {view.pendingEffects.map((effect) => (
              <li key={effect.id}>
                {effect.cardId} from {nicknameOf(view, effect.sourcePlayerId)} →{' '}
                {nicknameOf(view, effect.targetPlayerId)} (queuedAt {effect.queuedAt})
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActionLogPanel view={view} />

      <section>
        <h2>Your zone</h2>
        <p className="flex flex-wrap items-center gap-2">
          Status:
          {(() => {
            const self = view.players.find((player) => player.isYou);
            if (self === undefined) {
              return ' —';
            }
            return (
              <>
                {' '}
                connected
                <ConnectionBadge player={self} />
              </>
            );
          })()}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <KitPortrait kitId={view.self.kitId} />
          <ResourceIcon kind="life" value={view.self.lives} />
          <ResourceIcon kind="shield" value={view.self.shield} />
          <ResourceIcon kind="point" value={view.self.points} />
          <ResourceIcon kind="upgradePoint" value={view.self.upgradePoints} />
          {view.self.shieldIsUpgraded ? (
            <span className="text-xs text-ink-muted">Shield upgraded</span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {view.self.hand.map((card) => (
            <Card key={card.instanceId} instance={card} />
          ))}
        </div>
        <h3>Specials</h3>
        {view.self.specialCards.length === 0 ? (
          <p>None</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {view.self.specialCards.map((card) => (
              <Card key={card.instanceId} instance={card} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Actions</h2>
        <Button variant="yellow" disabled={!isMyTurn || actionsLocked} onClick={onDraw}>
          Draw (+{drawValue} point{drawValue === 1 ? '' : 's'})
        </Button>
        <div>
          <label>
            Play{' '}
            <select
              value={playInstanceId}
              disabled={!isMyTurn || actionsLocked || playableCards.length === 0}
              onChange={(event) => {
                setPlayInstanceId(event.target.value);
              }}
            >
              {view.self.hand.map((card) => (
                <option key={card.instanceId} value={card.instanceId}>
                  {card.cardId}
                  {card.isUpgraded ? ' ↑' : ''}
                </option>
              ))}
              {view.self.specialCards.map((card) => (
                <option key={card.instanceId} value={card.instanceId}>
                  [special] {card.cardId}
                  {card.isUpgraded ? ' ↑' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeTarget}
              disabled={!isMyTurn || actionsLocked}
              onChange={(event) => {
                setIncludeTarget(event.target.checked);
              }}
            />{' '}
            Include target (uncheck for Tax / Regen / Shield / Mirror / most specials; check for
            Cloning)
          </label>
          <label>
            Quantity (Regen){' '}
            <input
              type="number"
              min={1}
              max={4}
              value={playQuantity}
              disabled={!isMyTurn || actionsLocked}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isInteger(next) && next >= 1 && next <= 4) {
                  setPlayQuantity(next);
                }
              }}
            />
          </label>
          <Button variant="purple"
            disabled={
              !isMyTurn ||
              actionsLocked ||
              playInstanceId === '' ||
              (includeTarget && targetId === '')
            }
            onClick={onPlay}
          >
            Play card
            {selectedPlayCard !== undefined ? ` (${selectedPlayCard.cardId})` : ''}
          </Button>
        </div>
        {allowsMultiAttack && (
          <div>
            <h3>Assassin multi-attack (min 2)</h3>
            <ul>
              {attackCards.map((card) => {
                const checked = multiAttackIds.includes(card.instanceId);
                const rowTarget = multiAttackTargets[card.instanceId] ?? targetId;

                return (
                  <li key={card.instanceId}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isMyTurn || actionsLocked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setMultiAttackIds([...multiAttackIds, card.instanceId]);
                            setMultiAttackTargets({
                              ...multiAttackTargets,
                              [card.instanceId]: rowTarget !== '' ? rowTarget : (opponents[0]?.id ?? ''),
                            });
                          } else {
                            setMultiAttackIds(
                              multiAttackIds.filter((id) => id !== card.instanceId),
                            );
                            const next: Record<string, string> = {};
                            for (const [id, value] of Object.entries(multiAttackTargets)) {
                              if (id !== card.instanceId) {
                                next[id] = value;
                              }
                            }
                            setMultiAttackTargets(next);
                          }
                        }}
                      />{' '}
                      {card.cardId}
                      {card.isUpgraded ? ' ↑' : ''}
                    </label>
                    {checked && (
                      <select
                        value={rowTarget}
                        disabled={!isMyTurn || actionsLocked}
                        onChange={(event) => {
                          setMultiAttackTargets({
                            ...multiAttackTargets,
                            [card.instanceId]: event.target.value,
                          });
                        }}
                      >
                        {opponents
                          .filter((player) => !player.isEliminated)
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.nickname}
                            </option>
                          ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
            <Button variant="purple"
              disabled={
                !isMyTurn ||
                actionsLocked ||
                multiAttackIds.length < 2 ||
                multiAttackIds.some((id) => {
                  const chosen = multiAttackTargets[id];
                  return chosen === undefined || chosen === '';
                })
              }
              onClick={onPlayMultipleAttacks}
            >
              Play {multiAttackIds.length} attacks
            </Button>
          </div>
        )}
        <div>
          <label>
            Buy{' '}
            <select
              value={buyCardId}
              disabled={!isMyTurn || actionsLocked}
              onChange={(event) => {
                setBuyCardId(event.target.value);
              }}
            >
              {SHARED_CARD_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <Button variant="orange" disabled={!isMyTurn || actionsLocked} onClick={onBuy}>
            Buy card
          </Button>
        </div>
        <div>
          <label>
            Sell{' '}
            <select
              value={sellInstanceId}
              disabled={
                !isMyTurn || actionsLocked || view.self.hand.length === 0
              }
              onChange={(event) => {
                setSellInstanceId(event.target.value);
              }}
            >
              {view.self.hand.map((card) => (
                <option key={card.instanceId} value={card.instanceId}>
                  {card.cardId}
                  {card.isUpgraded ? ' ↑' : ''}
                </option>
              ))}
            </select>
          </label>
          <Button variant="orange"
            disabled={!isMyTurn || actionsLocked || sellInstanceId === ''}
            onClick={onSell}
          >
            Sell card
          </Button>
        </div>
        <div>
          <label>
            Upgrade{' '}
            <select
              value={upgradeInstanceId}
              disabled={!isMyTurn || actionsLocked || upgradable.length === 0}
              onChange={(event) => {
                setUpgradeInstanceId(event.target.value);
              }}
            >
              {upgradable.map((card) => (
                <option key={card.instanceId} value={card.instanceId}>
                  {card.cardId}
                </option>
              ))}
            </select>
          </label>
          <Button variant="orange"
            disabled={
              !isMyTurn ||
              actionsLocked ||
              upgradeInstanceId === '' ||
              view.self.upgradePoints < 1
            }
            onClick={onUpgrade}
          >
            Upgrade card
          </Button>
        </div>
        <Button variant="orange"
          disabled={!isMyTurn || actionsLocked}
          onClick={onBuyUpgradePoint}
        >
          Buy upgrade point
        </Button>
        <Button variant="orange"
          disabled={!isMyTurn || actionsLocked || view.self.points < 20}
          onClick={onBuySpecialCard}
        >
          Buy special card (20 pts)
        </Button>
        <Button variant="orange"
          disabled={!isMyTurn || actionsLocked || view.self.upgradePoints < 1}
          onClick={onSellUpgradePoint}
        >
          Sell upgrade point
        </Button>
      </section>

      <Button variant="red" onClick={onLeave}>
        Leave
      </Button>
    </main>
  );
}

function nicknameOf(view: PlayingStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}

function buildRewardChoice(kind: RewardKind, cardInstanceId: string): RewardChoice | null {
  if (kind === 'card') {
    if (cardInstanceId === '') {
      return null;
    }

    return { type: 'card', instanceId: cardInstanceId };
  }

  return { type: kind };
}
