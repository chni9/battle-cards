/**
 * Table screen — felt shell + card-first UX (Lot 12).
 * Same intents/payloads as V1; zero rule logic. docs/agent/frontend.md · tech spec v2 §6.
 */

import {
  ATTACK_CARD_IDS,
  SHARED_CARD_IDS,
  getKit,
  type ActionResolvedPayload,
  type CardInstance,
  type KitId,
  type MirrorChoiceRequiredPayload,
  type PlayingStateView,
  type RewardChoice,
  type RewardChoiceRequiredPayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { ActionLogPanel } from '../action-log/action-log-panel';
import type { PlayCardOptions } from '../net/use-room-connection';
import { CardActions, type TableDialog } from './table/card-actions';
import { EconomyBar } from './table/economy-bar';
import { KitInspectDialog } from './table/kit-inspect-dialog';
import { OpponentZone } from './table/opponent-zone';
import { PendingQueue } from './table/pending-queue';
import { PrivateZone } from './table/private-zone';
import { cardPlayNeedsTarget } from './table/table-helpers';
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
  const [dialog, setDialog] = useState<TableDialog>(null);
  const [inspectKitId, setInspectKitId] = useState<KitId | null>(null);

  const isMyTurn = view.currentTurnPlayerId === view.you;
  const selfPublic = view.players.find((player) => player.isYou);
  const selfEliminated = selfPublic?.isEliminated === true;
  const actionsLocked =
    rewardChoice !== null || mirrorChoice !== null || selfEliminated;
  const kit = getKit(view.self.kitId);
  const drawValue = kit.startingResources.draw;
  const allowsMultiAttack = kit.traits.allowsMultipleAttacksPerTurn;
  const attackCards = view.self.hand.filter((card) => isAttackCardId(card.cardId));
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
  const progressRatio =
    deadlineMs === null || turnPaused
      ? null
      : Math.max(0, Math.min(1, (deadlineMs - nowMs) / 60_000));

  const opponents = view.players.filter((player) => !player.isYou);
  const incomingEffects = view.pendingEffects.filter(
    (effect) => effect.targetPlayerId === view.you,
  );
  const othersPending = view.pendingEffects.filter(
    (effect) => effect.targetPlayerId !== view.you,
  );

  const mirrorSecondsLeft =
    mirrorChoice === null
      ? null
      : Math.max(0, Math.ceil((mirrorChoice.deadlineMs - nowMs) / 1000));
  const rewardSecondsLeft =
    rewardChoice === null
      ? null
      : Math.max(0, Math.ceil((rewardChoice.deadlineMs - nowMs) / 1000));

  const subChoiceLabel =
    mirrorChoice !== null
      ? `Mirror choice: ${mirrorSecondsLeft ?? '—'}s`
      : rewardChoice !== null
        ? `Reward choice: ${rewardSecondsLeft ?? '—'}s`
        : undefined;

  const subChoiceProgressRatio =
    mirrorChoice !== null
      ? Math.max(0, Math.min(1, (mirrorChoice.deadlineMs - nowMs) / 30_000))
      : rewardChoice !== null
        ? Math.max(0, Math.min(1, (rewardChoice.deadlineMs - nowMs) / 30_000))
        : null;

  function onSelectOwnCard(instanceId: string): void {
    const fromSpecial = view.self.specialCards.some((c) => c.instanceId === instanceId);
    const instance =
      view.self.hand.find((c) => c.instanceId === instanceId) ??
      view.self.specialCards.find((c) => c.instanceId === instanceId);
    if (instance === undefined) {
      return;
    }
    setDialog({ kind: 'actions', instance, fromSpecial });
  }

  function onBeginUse(instance: CardInstance): void {
    if (instance.cardId === 'regeneration') {
      setDialog({ kind: 'quantity', instance });
      return;
    }
    if (cardPlayNeedsTarget(instance.cardId)) {
      setDialog({ kind: 'target', instance });
      return;
    }
    onPlayCard(instance.instanceId);
    setDialog(null);
  }

  function onInspectSpyCard(playerId: string, instanceId: string): void {
    const player = opponents.find((p) => p.id === playerId);
    const instance =
      player?.spied?.hand.find((c) => c.instanceId === instanceId) ??
      player?.spied?.specialCards.find((c) => c.instanceId === instanceId);
    if (instance === undefined) {
      return;
    }
    setDialog({ kind: 'inspect', instance });
  }

  return (
    <>
      <TableShell
        header={
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink md:text-xl">
              Card Battle
            </h1>
            <p className="text-xs text-ink-muted md:text-sm">
              Code {view.gameCode} · {statusLabel}
            </p>
            {error !== null && (
              <p className="mt-0.5 text-sm font-medium text-cta-red" role="alert">
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
            {...(subChoiceLabel !== undefined ? { subChoiceLabel } : {})}
            subChoiceProgressRatio={subChoiceProgressRatio}
          />
        }
        prompts={
          selfEliminated ? (
            <section className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-2">
              <h2 className="text-sm font-semibold">Eliminated</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                You are a spectator. Actions are locked while rewards (if any) resolve.
              </p>
            </section>
          ) : null
        }
        opponentSeats={opponents.map((player) => (
          <OpponentZone
            key={player.id}
            player={player}
            onInspectCard={(instanceId) => {
              onInspectSpyCard(player.id, instanceId);
            }}
            onInspectKit={(kitId) => {
              setInspectKitId(kitId);
            }}
          />
        ))}
        pending={
          <PendingQueue
            view={view}
            effects={othersPending}
            title="Pending on others"
            tone="felt"
          />
        }
        actionLog={<ActionLogPanel view={view} />}
        privateZone={
          <PrivateZone
            view={view}
            selfPublic={selfPublic}
            incomingEffects={incomingEffects}
            onInspectKit={() => {
              setInspectKitId(view.self.kitId);
            }}
            onSelectOwnCard={onSelectOwnCard}
          />
        }
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
              setDialog({ kind: 'buy' });
            }}
            onLeave={onLeave}
          />
        }
      />

      {inspectKitId !== null && (
        <KitInspectDialog
          open
          kitId={inspectKitId}
          onClose={() => {
            setInspectKitId(null);
          }}
        />
      )}

      <CardActions
        view={view}
        opponents={opponents}
        dialog={dialog}
        setDialog={setDialog}
        isMyTurn={isMyTurn}
        actionsLocked={actionsLocked}
        allowsMultiAttack={allowsMultiAttack}
        attackCards={attackCards}
        mirrorChoice={mirrorChoice}
        rewardChoice={rewardChoice}
        nowMs={nowMs}
        onPlayCard={onPlayCard}
        onPlayMultipleAttacks={onPlayMultipleAttacks}
        onUpgradeCard={onUpgradeCard}
        onSellCard={onSellCard}
        onBuyCard={onBuyCard}
        onBuySpecialCard={onBuySpecialCard}
        onChooseMirrorTarget={onChooseMirrorTarget}
        onChooseEliminationReward={onChooseEliminationReward}
        onBeginUse={onBeginUse}
      />
    </>
  );
}
