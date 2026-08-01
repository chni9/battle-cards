/**
 * Table screen — felt shell (L12-01). Zone restyles L12-02…08.
 * Same intents/payloads as V1; zero rule logic. docs/agent/frontend.md · tech spec v2 §6.
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
import { useState, type ReactElement } from 'react';

import { ActionLogPanel } from '../action-log/action-log-panel';
import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import type { PlayCardOptions } from '../net/use-room-connection';
import { EconomyBar } from './table/economy-bar';
import { OpponentZone } from './table/opponent-zone';
import { PendingQueue } from './table/pending-queue';
import { PrivateZone } from './table/private-zone';
import {
  REWARD_KINDS,
  buildRewardChoice,
  nicknameOf,
  type RewardKind,
} from './table/table-helpers';
import { TableShell } from './table/table-shell';
import { Timers } from './table/timers';

function isAttackCardId(cardId: string): boolean {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
}

export interface TableScreenProps {
  view: PlayingStateView;
  error: string | null;
  statusLabel: string;
  nowMs: number;
  deadlineMs: number | null;
  lastActionResolved: ActionResolvedPayload | null;
  mirrorChoice: MirrorChoiceRequiredPayload | null;
  rewardChoice: RewardChoiceRequiredPayload | null;
  onDraw: () => void;
  onPlayCard: (instanceId: string, options?: PlayCardOptions) => void;
  onPlayMultipleAttacks: (
    attacks: readonly { instanceId: string; targetPlayerId: string }[],
  ) => void;
  onChooseMirrorTarget: (pendingEffectId: string, newTargetPlayerId: string) => void;
  onChooseEliminationReward: (
    eliminationId: string,
    choices: [RewardChoice, RewardChoice],
  ) => void;
  onBuyCard: (cardId: (typeof SHARED_CARD_IDS)[number]) => void;
  onSellCard: (instanceId: string) => void;
  onUpgradeCard: (instanceId: string) => void;
  onBuyUpgradePoint: () => void;
  onBuySpecialCard: () => void;
  onSellUpgradePoint: () => void;
  onLeave: () => void;
}

export function TableScreen({
  view,
  error,
  statusLabel,
  nowMs,
  deadlineMs,
  lastActionResolved,
  mirrorChoice,
  rewardChoice,
  onDraw,
  onPlayCard,
  onPlayMultipleAttacks,
  onChooseMirrorTarget,
  onChooseEliminationReward,
  onBuyCard,
  onSellCard,
  onUpgradeCard,
  onBuyUpgradePoint,
  onBuySpecialCard,
  onSellUpgradePoint,
  onLeave,
}: TableScreenProps): ReactElement {
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
  /** Buy dialog shell — full buy paths land in L12-08; interim keeps purchases reachable. */
  const [buyOpen, setBuyOpen] = useState(false);

  const isMyTurn = view.currentTurnPlayerId === view.you;
  const selfPublic = view.players.find((player) => player.isYou);
  const selfEliminated = selfPublic?.isEliminated === true;
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
  // Cosmetic progress vs a 60s reference window (server deadline remains authority).
  // L12-07 may refine presentation; do not invent a client deadline.
  const progressRatio =
    deadlineMs === null || turnPaused
      ? null
      : Math.max(0, Math.min(1, (deadlineMs - nowMs) / 60_000));

  const opponents = view.players.filter((player) => !player.isYou);
  const defaultOpponentId = opponents[0]?.id ?? '';
  const resolvedTargetId = opponents.some((player) => player.id === targetId)
    ? targetId
    : defaultOpponentId;
  const resolvedPlayInstanceId = playableCards.some(
    (card) => card.instanceId === playInstanceId,
  )
    ? playInstanceId
    : (playableCards[0]?.instanceId ?? '');
  const resolvedSellInstanceId = view.self.hand.some(
    (card) => card.instanceId === sellInstanceId,
  )
    ? sellInstanceId
    : (view.self.hand[0]?.instanceId ?? '');
  const upgradable = playableCards.filter((card) => !card.isUpgraded);
  const resolvedUpgradeInstanceId = upgradable.some(
    (card) => card.instanceId === upgradeInstanceId,
  )
    ? upgradeInstanceId
    : (upgradable[0]?.instanceId ?? '');
  const selectedPlayCard = playableCards.find(
    (card) => card.instanceId === resolvedPlayInstanceId,
  );
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
  const resolvedMirrorEffectId =
    mirrorChoice === null
      ? ''
      : mirrorChoice.eligibleEffectIds.includes(mirrorEffectId)
        ? mirrorEffectId
        : (mirrorChoice.eligibleEffectIds[0] ?? '');
  const resolvedMirrorTargetId = opponents.some((player) => player.id === mirrorTargetId)
    ? mirrorTargetId
    : defaultOpponentId;
  const rewardCardIds =
    rewardChoice?.availableCards.map((card) => card.instanceId) ?? [];
  const firstRewardCardId = rewardChoice?.availableCards[0]?.instanceId ?? '';
  const resolvedRewardCard1 =
    rewardKind1 === 'card' &&
    (rewardCard1 === '' || !rewardCardIds.includes(rewardCard1))
      ? firstRewardCardId
      : rewardCard1;
  const resolvedRewardCard2 =
    rewardKind2 === 'card' &&
    (rewardCard2 === '' || !rewardCardIds.includes(rewardCard2))
      ? firstRewardCardId
      : rewardCard2;

  const rewardConfirmReady =
    buildRewardChoice(rewardKind1, resolvedRewardCard1) !== null &&
    buildRewardChoice(rewardKind2, resolvedRewardCard2) !== null;

  const subChoiceLabel =
    mirrorChoice !== null
      ? `Mirror choice: ${mirrorSecondsLeft ?? '—'}s`
      : rewardChoice !== null
        ? `Reward choice: ${rewardSecondsLeft ?? '—'}s`
        : undefined;

  return (
    <>
      <TableShell
        header={
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Card Battle</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Code {view.gameCode} · {statusLabel}
            </p>
            {error !== null && (
              <p className="mt-1 text-sm font-medium text-cta-red" role="alert">
                {error}
              </p>
            )}
          </div>
        }
        turn={
          <Timers
            activeNickname={activePlayer?.nickname ?? '—'}
            isMyTurn={isMyTurn}
            timerLabel={timerLabel}
            lastActionResolved={lastActionResolved}
            progressRatio={progressRatio}
            subChoiceLabel={subChoiceLabel}
          />
        }
        prompts={
          <>
            {selfEliminated && (
              <section className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-3">
                <h2 className="text-sm font-semibold">Eliminated</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  You are a spectator. Actions are locked while rewards (if any) resolve.
                </p>
              </section>
            )}
            {mirrorChoice !== null && (
              <section className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-3">
                <h2 className="text-sm font-semibold">Mirror redirect</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Choose which pending attack to redirect ({mirrorSecondsLeft ?? '—'}s left).
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="text-sm">
                    Effect{' '}
                    <select
                      value={resolvedMirrorEffectId}
                      onChange={(event) => {
                        setMirrorEffectId(event.target.value);
                      }}
                      className="ml-1 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
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
                  <label className="text-sm">
                    New target{' '}
                    <select
                      value={resolvedMirrorTargetId}
                      onChange={(event) => {
                        setMirrorTargetId(event.target.value);
                      }}
                      className="ml-1 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
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
                  <Button
                    variant="green"
                    disabled={resolvedMirrorEffectId === '' || resolvedMirrorTargetId === ''}
                    onClick={() => {
                      onChooseMirrorTarget(resolvedMirrorEffectId, resolvedMirrorTargetId);
                    }}
                  >
                    Confirm redirect
                  </Button>
                </div>
              </section>
            )}
            {rewardChoice !== null && (
              <section className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-3">
                <h2 className="text-sm font-semibold">Elimination reward</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Pick two rewards from {nicknameOf(view, rewardChoice.eliminatedPlayerId)} (
                  {rewardSecondsLeft ?? '—'}s left).
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="text-sm">
                      Choice 1{' '}
                      <select
                        value={rewardKind1}
                        onChange={(event) => {
                          setRewardKind1(event.target.value as RewardKind);
                        }}
                        className="ml-1 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                      >
                        {REWARD_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    {rewardKind1 === 'card' && (
                      <label className="text-sm">
                        Card{' '}
                        <select
                          value={resolvedRewardCard1}
                          onChange={(event) => {
                            setRewardCard1(event.target.value);
                          }}
                          className="ml-1 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                        >
                          {rewardChoice.availableCards.map((card) => (
                            <option key={card.instanceId} value={card.instanceId}>
                              {card.cardId}
                              {card.isUpgraded ? ' ↑' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="text-sm">
                      Choice 2{' '}
                      <select
                        value={rewardKind2}
                        onChange={(event) => {
                          setRewardKind2(event.target.value as RewardKind);
                        }}
                        className="ml-1 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                      >
                        {REWARD_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    {rewardKind2 === 'card' && (
                      <label className="text-sm">
                        Card{' '}
                        <select
                          value={resolvedRewardCard2}
                          onChange={(event) => {
                            setRewardCard2(event.target.value);
                          }}
                          className="ml-1 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                        >
                          {rewardChoice.availableCards.map((card) => (
                            <option key={card.instanceId} value={card.instanceId}>
                              {card.cardId}
                              {card.isUpgraded ? ' ↑' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <Button
                    variant="green"
                    disabled={!rewardConfirmReady}
                    onClick={() => {
                      const choice1 = buildRewardChoice(rewardKind1, resolvedRewardCard1);
                      const choice2 = buildRewardChoice(rewardKind2, resolvedRewardCard2);
                      if (choice1 === null || choice2 === null) {
                        return;
                      }
                      onChooseEliminationReward(rewardChoice.eliminationId, [
                        choice1,
                        choice2,
                      ]);
                    }}
                  >
                    Confirm rewards
                  </Button>
                </div>
              </section>
            )}
          </>
        }
        opponentSeats={opponents.map((player) => (
          <OpponentZone
            key={player.id}
            player={player}
            selectedAsTarget={resolvedTargetId === player.id}
            targetDisabled={player.isEliminated}
            onSelectTarget={() => {
              setTargetId(player.id);
            }}
          />
        ))}
        pending={<PendingQueue view={view} effects={view.pendingEffects} />}
        actionLog={<ActionLogPanel view={view} />}
        privateZone={<PrivateZone view={view} selfPublic={selfPublic} />}
        economy={
          <EconomyBar
            isMyTurn={isMyTurn}
            actionsLocked={actionsLocked}
            drawValue={drawValue}
            upgradePoints={view.self.upgradePoints}
            onDraw={onDraw}
            onBuyUpgradePoint={onBuyUpgradePoint}
            onSellUpgradePoint={onSellUpgradePoint}
            onOpenBuy={() => {
              setBuyOpen(true);
            }}
            onLeave={onLeave}
          />
        }
        legacyActions={
          <div className="space-y-3">
            <p className="text-xs font-medium text-ink-muted">
              Legacy play controls (removed in L12-08)
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="text-sm">
                Play{' '}
                <select
                  value={resolvedPlayInstanceId}
                  disabled={!isMyTurn || actionsLocked || playableCards.length === 0}
                  onChange={(event) => {
                    setPlayInstanceId(event.target.value);
                  }}
                  className="rounded-[length:var(--radius-control)] border border-border px-2 py-1"
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
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={includeTarget}
                  disabled={!isMyTurn || actionsLocked}
                  onChange={(event) => {
                    setIncludeTarget(event.target.checked);
                  }}
                />{' '}
                Include target
              </label>
              <label className="text-sm">
                Qty{' '}
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
                  className="w-14 rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                />
              </label>
              <Button
                variant="purple"
                disabled={
                  !isMyTurn ||
                  actionsLocked ||
                  resolvedPlayInstanceId === '' ||
                  (includeTarget && resolvedTargetId === '')
                }
                onClick={() => {
                  if (resolvedPlayInstanceId === '') {
                    return;
                  }
                  const selected =
                    view.self.hand.find((card) => card.instanceId === resolvedPlayInstanceId) ??
                    view.self.specialCards.find(
                      (card) => card.instanceId === resolvedPlayInstanceId,
                    );
                  const options: PlayCardOptions = {
                    ...(includeTarget && resolvedTargetId !== ''
                      ? { targetPlayerId: resolvedTargetId }
                      : {}),
                    ...(selected?.cardId === 'regeneration'
                      ? { quantity: playQuantity }
                      : {}),
                  };
                  onPlayCard(resolvedPlayInstanceId, options);
                }}
              >
                Play card
                {selectedPlayCard !== undefined ? ` (${selectedPlayCard.cardId})` : ''}
              </Button>
            </div>
            {allowsMultiAttack && (
              <div>
                <h3 className="text-xs font-semibold text-ink-muted">
                  Assassin multi-attack (min 2)
                </h3>
                <ul className="mt-1 space-y-1">
                  {attackCards.map((card) => {
                    const checked = multiAttackIds.includes(card.instanceId);
                    const rowTarget = multiAttackTargets[card.instanceId] ?? resolvedTargetId;
                    return (
                      <li key={card.instanceId} className="flex flex-wrap items-center gap-2">
                        <label className="text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!isMyTurn || actionsLocked}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setMultiAttackIds([...multiAttackIds, card.instanceId]);
                                setMultiAttackTargets({
                                  ...multiAttackTargets,
                                  [card.instanceId]:
                                    rowTarget !== ''
                                      ? rowTarget
                                      : (opponents[0]?.id ?? ''),
                                });
                              } else {
                                setMultiAttackIds(
                                  multiAttackIds.filter((id) => id !== card.instanceId),
                                );
                                const next: Record<string, string> = {};
                                for (const [id, value] of Object.entries(
                                  multiAttackTargets,
                                )) {
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
                            className="rounded-[length:var(--radius-control)] border border-border px-2 py-1 text-sm"
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
                <Button
                  variant="purple"
                  className="mt-2"
                  disabled={
                    !isMyTurn ||
                    actionsLocked ||
                    multiAttackIds.length < 2 ||
                    multiAttackIds.some((id) => {
                      const chosen = multiAttackTargets[id];
                      return chosen === undefined || chosen === '';
                    })
                  }
                  onClick={() => {
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
                    onPlayMultipleAttacks(attacks);
                    setMultiAttackIds([]);
                    setMultiAttackTargets({});
                  }}
                >
                  Play {multiAttackIds.length} attacks
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="text-sm">
                Sell{' '}
                <select
                  value={resolvedSellInstanceId}
                  disabled={!isMyTurn || actionsLocked || view.self.hand.length === 0}
                  onChange={(event) => {
                    setSellInstanceId(event.target.value);
                  }}
                  className="rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                >
                  {view.self.hand.map((card) => (
                    <option key={card.instanceId} value={card.instanceId}>
                      {card.cardId}
                      {card.isUpgraded ? ' ↑' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="orange"
                disabled={!isMyTurn || actionsLocked || resolvedSellInstanceId === ''}
                onClick={() => {
                  if (resolvedSellInstanceId !== '') {
                    onSellCard(resolvedSellInstanceId);
                  }
                }}
              >
                Sell card
              </Button>
              <label className="text-sm">
                Upgrade{' '}
                <select
                  value={resolvedUpgradeInstanceId}
                  disabled={!isMyTurn || actionsLocked || upgradable.length === 0}
                  onChange={(event) => {
                    setUpgradeInstanceId(event.target.value);
                  }}
                  className="rounded-[length:var(--radius-control)] border border-border px-2 py-1"
                >
                  {upgradable.map((card) => (
                    <option key={card.instanceId} value={card.instanceId}>
                      {card.cardId}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="orange"
                disabled={
                  !isMyTurn ||
                  actionsLocked ||
                  resolvedUpgradeInstanceId === '' ||
                  view.self.upgradePoints < 1
                }
                onClick={() => {
                  if (resolvedUpgradeInstanceId !== '') {
                    onUpgradeCard(resolvedUpgradeInstanceId);
                  }
                }}
              >
                Upgrade card
              </Button>
            </div>
          </div>
        }
      />

      <Dialog
        open={buyOpen}
        title="Buy"
        onClose={() => {
          setBuyOpen(false);
        }}
        actions={
          <>
            <Button
              variant="orange"
              disabled={!isMyTurn || actionsLocked || view.self.points < 20}
              onClick={() => {
                onBuySpecialCard();
                setBuyOpen(false);
              }}
            >
              Buy special (20 pts)
            </Button>
            <Button
              variant="orange"
              disabled={!isMyTurn || actionsLocked}
              onClick={() => {
                onBuyCard(buyCardId as (typeof SHARED_CARD_IDS)[number]);
                setBuyOpen(false);
              }}
            >
              Buy shared
            </Button>
            <Button
              variant="red"
              onClick={() => {
                setBuyOpen(false);
              }}
            >
              Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Choose a purchase. Shared card pick is refined in L12-08.
        </p>
        <label className="mt-3 block text-sm">
          Shared card{' '}
          <select
            value={buyCardId}
            onChange={(event) => {
              setBuyCardId(event.target.value);
            }}
            className="mt-1 w-full rounded-[length:var(--radius-control)] border border-border px-2 py-2"
          >
            {SHARED_CARD_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </Dialog>
    </>
  );
}
