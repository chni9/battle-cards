/**
 * Home, lobby, table, and end screens — technical spec §7.
 * Functional only; no design system (see docs/agent/frontend.md).
 */

import {
  ATTACK_CARD_IDS,
  PROTOCOL_VERSION,
  SHARED_CARD_IDS,
  getKit,
  type ActionResolvedPayload,
  type MirrorChoiceRequiredPayload,
  type PlayingStateView,
  type RewardChoice,
  type RewardChoiceRequiredPayload,
} from '@card-battle/shared';
import { useEffect, useState } from 'react';

import { useRoomConnection, type PlayCardOptions } from './net/use-room-connection';

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

const STATUS_LABELS = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  failed: 'Could not join',
} as const;

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

  const canSubmit = nickname.trim().length > 0 && status !== 'connecting';

  if (view?.phase === 'finished') {
    const winner = view.players.find((player) => player.id === view.winnerPlayerId);

    return (
      <main>
        <h1>Card Battle</h1>
        <h2>Game over</h2>
        <p>Winner: {winner?.nickname ?? view.winnerPlayerId}</p>
        <ul>
          {view.players.map((player) => (
            <li key={player.id}>
              {player.nickname}
              {player.isEliminated ? ' (eliminated)' : ''}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void leaveGame()}>
          Return home
        </button>
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
    const isHost = view.hostPlayerId === view.you;
    const canLaunch = isHost && view.players.length >= 2;

    return (
      <main>
        <h1>Card Battle</h1>
        <p>Protocol v{PROTOCOL_VERSION}</p>
        <h2>Lobby</h2>
        <p>
          Game code: <strong>{view.gameCode}</strong>
          {isHost ? ' (you are the host)' : ''}
        </p>
        <p>{STATUS_LABELS[status]}</p>
        {error !== null && <p>{error}</p>}
        <h3>Players ({view.players.length}/4)</h3>
        <ul>
          {view.players.map((player) => (
            <li key={player.id}>
              {player.nickname}
              {player.id === view.you ? ' (you)' : ''}
              {player.id === view.hostPlayerId ? ' — host' : ''}
            </li>
          ))}
        </ul>
        {isHost && (
          <button type="button" disabled={!canLaunch} onClick={startGame}>
            Start game
          </button>
        )}
        {!isHost && <p>Waiting for the host to start…</p>}
        <button type="button" onClick={() => void leaveGame()}>
          Leave
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Card Battle</h1>
      <p>Protocol v{PROTOCOL_VERSION}</p>
      <p>{STATUS_LABELS[status]}</p>
      {error !== null && <p>{error}</p>}

      <label>
        Nickname
        <input
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
          }}
          maxLength={24}
          autoComplete="nickname"
        />
      </label>

      <section>
        <h2>Create a game</h2>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            void createGame(nickname);
          }}
        >
          Create
        </button>
      </section>

      <section>
        <h2>Join a game</h2>
        <label>
          Game code
          <input
            value={joinCode}
            onChange={(event) => {
              setJoinCode(event.target.value.toUpperCase());
            }}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          disabled={!canSubmit || joinCode.trim().length !== 6}
          onClick={() => {
            void joinGame(joinCode, nickname);
          }}
        >
          Join
        </button>
      </section>
    </main>
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
  const secondsLeft =
    deadlineMs === null ? null : Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
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
        <p>Timer: {secondsLeft === null ? '—' : `${secondsLeft}s`}</p>
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
          <button
            type="button"
            disabled={mirrorEffectId === '' || mirrorTargetId === ''}
            onClick={onChooseMirror}
          >
            Confirm redirect
          </button>
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
          <button type="button" disabled={!rewardConfirmReady} onClick={onChooseReward}>
            Confirm rewards
          </button>
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
                {player.isEliminated ? ' (eliminated)' : ''}
              </label>
              {player.spied !== undefined && (
                <div>
                  <p>
                    Spied · kit {player.spied.kitId}
                    {player.spied.lives !== undefined
                      ? ` · live: lives ${player.spied.lives}, points ${player.spied.points ?? 0}, UP ${player.spied.upgradePoints ?? 0}, shield ${player.spied.shield ?? 0}`
                      : ''}
                    {player.spied.resourcesSnapshot !== undefined
                      ? ` · snapshot from turn ${player.spied.resourcesSnapshot.turnSequence}: lives ${player.spied.resourcesSnapshot.lives}, points ${player.spied.resourcesSnapshot.points}, UP ${player.spied.resourcesSnapshot.upgradePoints}, shield ${player.spied.resourcesSnapshot.shield}`
                      : ''}
                  </p>
                  <p>Hand:</p>
                  <ul>
                    {player.spied.hand.map((card) => (
                      <li key={card.instanceId}>
                        {card.cardId}
                        {card.isUpgraded ? ' (upgraded)' : ''}
                      </li>
                    ))}
                  </ul>
                  {player.spied.specialCards.length > 0 && (
                    <>
                      <p>Specials:</p>
                      <ul>
                        {player.spied.specialCards.map((card) => (
                          <li key={card.instanceId}>
                            {card.cardId}
                            {card.isUpgraded ? ' (upgraded)' : ''}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
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

      <section>
        <h2>Action log</h2>
        {view.actionLog.length === 0 ? (
          <p>No actions yet</p>
        ) : (
          <ol>
            {view.actionLog.map((entry, index) => (
              <li key={`${entry.turnSequence}-${index}`}>
                {nicknameOf(view, entry.actorPlayerId)}: {entry.action}
                {entry.cardId !== undefined ? ` ${entry.cardId}` : ''}
                {entry.targetPlayerId !== undefined
                  ? ` → ${nicknameOf(view, entry.targetPlayerId)}`
                  : ''}
                {entry.attacks !== undefined
                  ? ` [${entry.attacks
                      .map(
                        (attack) =>
                          `${attack.cardId}→${nicknameOf(view, attack.targetPlayerId)}`,
                      )
                      .join(', ')}]`
                  : ''}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>Your zone</h2>
        <p>
          Lives {view.self.lives} · Shield {view.self.shield}
          {view.self.shieldIsUpgraded ? ' (upgraded)' : ''} · Points {view.self.points} · Upgrade
          points {view.self.upgradePoints} · Kit {view.self.kitId}
        </p>
        <ul>
          {view.self.hand.map((card) => (
            <li key={card.instanceId}>
              {card.cardId}
              {card.isUpgraded ? ' (upgraded)' : ''}
            </li>
          ))}
        </ul>
        <h3>Specials</h3>
        {view.self.specialCards.length === 0 ? (
          <p>None</p>
        ) : (
          <ul>
            {view.self.specialCards.map((card) => (
              <li key={card.instanceId}>
                {card.cardId}
                {card.isUpgraded ? ' (upgraded)' : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Actions</h2>
        <button type="button" disabled={!isMyTurn || actionsLocked} onClick={onDraw}>
          Draw (+{drawValue} point{drawValue === 1 ? '' : 's'})
        </button>
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
          <button
            type="button"
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
          </button>
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
            <button
              type="button"
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
            </button>
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
          <button type="button" disabled={!isMyTurn || actionsLocked} onClick={onBuy}>
            Buy card
          </button>
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
          <button
            type="button"
            disabled={!isMyTurn || actionsLocked || sellInstanceId === ''}
            onClick={onSell}
          >
            Sell card
          </button>
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
          <button
            type="button"
            disabled={
              !isMyTurn ||
              actionsLocked ||
              upgradeInstanceId === '' ||
              view.self.upgradePoints < 1
            }
            onClick={onUpgrade}
          >
            Upgrade card
          </button>
        </div>
        <button
          type="button"
          disabled={!isMyTurn || actionsLocked}
          onClick={onBuyUpgradePoint}
        >
          Buy upgrade point
        </button>
        <button
          type="button"
          disabled={!isMyTurn || actionsLocked || view.self.points < 20}
          onClick={onBuySpecialCard}
        >
          Buy special card (20 pts)
        </button>
        <button
          type="button"
          disabled={!isMyTurn || actionsLocked || view.self.upgradePoints < 1}
          onClick={onSellUpgradePoint}
        >
          Sell upgrade point
        </button>
      </section>

      <button type="button" onClick={onLeave}>
        Leave
      </button>
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
