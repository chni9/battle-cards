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
} from '@card-battle/shared';
import { useEffect, useState } from 'react';

import { useRoomConnection, type PlayCardOptions } from './net/use-room-connection';

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
    buyCard,
    sellCard,
    upgradeCard,
    buyUpgradePoint,
    buySpecialCard,
    sellUpgradePoint,
    lastTurnStarted,
    lastActionResolved,
    mirrorChoice,
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
  onDraw: () => void;
  onPlay: () => void;
  onPlayMultipleAttacks: () => void;
  multiAttackIds: string[];
  setMultiAttackIds: (ids: string[]) => void;
  multiAttackTargets: Record<string, string>;
  setMultiAttackTargets: (targets: Record<string, string>) => void;
  onChooseMirror: () => void;
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
    onDraw,
    onPlay,
    onPlayMultipleAttacks,
    multiAttackIds,
    setMultiAttackIds,
    multiAttackTargets,
    setMultiAttackTargets,
    onChooseMirror,
    onBuy,
    onSell,
    onUpgrade,
    onBuyUpgradePoint,
    onBuySpecialCard,
    onSellUpgradePoint,
    onLeave,
  } = props;

  const isMyTurn = view.currentTurnPlayerId === view.you;
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
        <button type="button" disabled={!isMyTurn || mirrorChoice !== null} onClick={onDraw}>
          Draw (+{drawValue} point{drawValue === 1 ? '' : 's'})
        </button>
        <div>
          <label>
            Play{' '}
            <select
              value={playInstanceId}
              disabled={!isMyTurn || mirrorChoice !== null || playableCards.length === 0}
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
              disabled={!isMyTurn || mirrorChoice !== null}
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
              disabled={!isMyTurn || mirrorChoice !== null}
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
              mirrorChoice !== null ||
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
                        disabled={!isMyTurn || mirrorChoice !== null}
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
                        disabled={!isMyTurn || mirrorChoice !== null}
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
                mirrorChoice !== null ||
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
              disabled={!isMyTurn || mirrorChoice !== null}
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
          <button type="button" disabled={!isMyTurn || mirrorChoice !== null} onClick={onBuy}>
            Buy card
          </button>
        </div>
        <div>
          <label>
            Sell{' '}
            <select
              value={sellInstanceId}
              disabled={
                !isMyTurn || mirrorChoice !== null || view.self.hand.length === 0
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
            disabled={!isMyTurn || mirrorChoice !== null || sellInstanceId === ''}
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
              disabled={!isMyTurn || mirrorChoice !== null || upgradable.length === 0}
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
              mirrorChoice !== null ||
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
          disabled={!isMyTurn || mirrorChoice !== null}
          onClick={onBuyUpgradePoint}
        >
          Buy upgrade point
        </button>
        <button
          type="button"
          disabled={!isMyTurn || mirrorChoice !== null || view.self.points < 20}
          onClick={onBuySpecialCard}
        >
          Buy special card (20 pts)
        </button>
        <button
          type="button"
          disabled={!isMyTurn || mirrorChoice !== null || view.self.upgradePoints < 1}
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
