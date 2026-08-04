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
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ActionLogPanel } from '../action-log/action-log-panel';
import {
  measureBuyCardFlyout,
  measureBuySpecialFlyout,
  measurePlayFlyout,
  measureSellCardFlyout,
} from '../fx/play-flyout';
import { TableFxProvider } from '../fx/table-fx-context';
import { useTableFx } from '../fx/table-fx-hooks';
import type { PlayCardOptions } from '../net/use-room-connection';
import { CardActions, type TableDialog } from './table/card-actions';
import { ACTIVE_SHIELD_INSTANCE_ID } from './table/active-display';
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

export function TableScreen(props: TableScreenProps): ReactElement {
  return (
    <TableFxProvider>
      <TableScreenInner {...props} />
    </TableFxProvider>
  );
}

function TableScreenInner({
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
  const { enqueue } = useTableFx();
  const [dialog, setDialog] = useState<TableDialog>(null);
  const [inspectKitId, setInspectKitId] = useState<KitId | null>(null);

  const findOwnCard = (instanceId: string): CardInstance | undefined =>
    view.self.hand.find((c) => c.instanceId === instanceId) ??
    view.self.specialCards.find((c) => c.instanceId === instanceId);

  const playCardWithFx = (instanceId: string, options?: PlayCardOptions): void => {
    const card = findOwnCard(instanceId);
    onPlayCard(instanceId, options);
    if (card === undefined) {
      return;
    }
    const measured = measurePlayFlyout(instanceId, card.cardId, card.isUpgraded);
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const playMultipleWithFx = (
    attacks: readonly { instanceId: string; targetPlayerId: string }[],
  ): void => {
    onPlayMultipleAttacks(attacks);
    const first = attacks[0];
    if (first === undefined) {
      return;
    }
    const card = findOwnCard(first.instanceId);
    if (card === undefined) {
      return;
    }
    const measured = measurePlayFlyout(first.instanceId, card.cardId, card.isUpgraded);
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const drawWithFx = (): void => {
    // Points Δ → ResourceIcon enqueues log ↔ token chips (avoid double flyout).
    onDraw();
  };

  const buyUpgradeWithFx = (): void => {
    onBuyUpgradePoint();
  };

  const sellUpgradeWithFx = (): void => {
    onSellUpgradePoint();
  };

  const buyCardWithFx = (cardId: (typeof SHARED_CARD_IDS)[number]): void => {
    onBuyCard(cardId);
    const measured = measureBuyCardFlyout(cardId);
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const buySpecialWithFx = (): void => {
    onBuySpecialCard();
    const measured = measureBuySpecialFlyout();
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const sellCardWithFx = (instanceId: string): void => {
    const card = findOwnCard(instanceId);
    onSellCard(instanceId);
    if (card === undefined) {
      return;
    }
    const measured = measureSellCardFlyout(instanceId, card.cardId, card.isUpgraded);
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const lastResolvedKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastActionResolved === null) {
      return;
    }
    const key = `${lastActionResolved.effectId}:${lastActionResolved.outcome}`;
    if (lastResolvedKey.current === key) {
      return;
    }
    lastResolvedKey.current = key;
    enqueue({
      kind: 'resolutionFlash',
      outcome: lastActionResolved.outcome,
      effectId: lastActionResolved.effectId,
    });
  }, [lastActionResolved, enqueue]);

  const seenElimKeys = useRef(new Set<string>());
  useEffect(() => {
    for (const entry of view.actionLog) {
      if (entry.kind !== 'playerEliminated') {
        continue;
      }
      const key = `${entry.playerId}:${String(entry.turnSequence)}:${entry.reason}`;
      if (seenElimKeys.current.has(key)) {
        continue;
      }
      seenElimKeys.current.add(key);
      enqueue({ kind: 'eliminationBeat', playerId: entry.playerId });
    }
  }, [view.actionLog, enqueue]);

  const lastRewardElimId = useRef<string | null>(null);
  useEffect(() => {
    if (rewardChoice === null) {
      lastRewardElimId.current = null;
      return;
    }
    if (lastRewardElimId.current === rewardChoice.eliminationId) {
      return;
    }
    lastRewardElimId.current = rewardChoice.eliminationId;
    enqueue({
      kind: 'rewardPulse',
      eliminationId: rewardChoice.eliminationId,
    });
  }, [rewardChoice, enqueue]);

  const mirrorHighlightIds =
    mirrorChoice === null ? [] : mirrorChoice.eligibleEffectIds;

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
    playCardWithFx(instance.instanceId);
    setDialog(null);
  }

  function onInspectSpyCard(playerId: string, instanceId: string): void {
    const player = opponents.find((p) => p.id === playerId);
    const instance =
      player?.eliminationReveal?.hand.find((c) => c.instanceId === instanceId) ??
      player?.eliminationReveal?.specialCards.find((c) => c.instanceId === instanceId) ??
      player?.spied?.hand.find((c) => c.instanceId === instanceId) ??
      player?.spied?.specialCards.find((c) => c.instanceId === instanceId);
    if (instance === undefined) {
      return;
    }
    setDialog({ kind: 'inspect', instance, source: 'spy' });
  }

  function onInspectActive(playerId: string, effectId: string): void {
    if (effectId === ACTIVE_SHIELD_INSTANCE_ID) {
      const isUpgraded =
        playerId === view.you
          ? view.self.shieldIsUpgraded
          : (opponents.find((p) => p.id === playerId)?.activeShield?.isUpgraded ??
            false);
      const hasShield =
        playerId === view.you
          ? view.self.shield > 0
          : (opponents.find((p) => p.id === playerId)?.activeShield ?? null) !==
            null;
      if (!hasShield) {
        return;
      }
      setDialog({
        kind: 'inspect',
        instance: {
          instanceId: ACTIVE_SHIELD_INSTANCE_ID,
          cardId: 'shield',
          isUpgraded,
        },
        activated: false,
        source: 'active',
      });
      return;
    }

    const player =
      playerId === view.you
        ? undefined
        : opponents.find((p) => p.id === playerId);
    const effect =
      playerId === view.you
        ? view.self.activePersistentEffects.find((e) => e.id === effectId)
        : player?.activePersistentEffects.find((e) => e.id === effectId);
    if (effect === undefined) {
      return;
    }
    setDialog({
      kind: 'inspect',
      instance: {
        instanceId: effect.id,
        cardId: effect.cardId,
        isUpgraded: effect.isUpgraded,
      },
      activated: true,
      counter: effect.counter,
      source: 'active',
    });
  }

  return (
    <>
      <TableShell
        turn={
          <Timers
            gameCode={view.gameCode}
            statusLabel={statusLabel}
            error={error}
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
            onInspectActive={(effectId) => {
              onInspectActive(player.id, effectId);
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
            compact
            tone="felt"
            highlightedIds={mirrorHighlightIds}
          />
        }
        actionLog={<ActionLogPanel view={view} />}
        privateZone={
          <PrivateZone
            view={view}
            selfPublic={selfPublic}
            incomingEffects={incomingEffects}
            mirrorHighlightIds={mirrorHighlightIds}
            onInspectKit={() => {
              setInspectKitId(view.self.kitId);
            }}
            onSelectOwnCard={onSelectOwnCard}
            onSelectActive={(effectId) => {
              onInspectActive(view.you, effectId);
            }}
          />
        }
        economy={
          <EconomyBar
            isMyTurn={isMyTurn}
            actionsLocked={actionsLocked}
            drawValue={drawValue}
            upgradePoints={view.self.upgradePoints}
            onDraw={drawWithFx}
            onBuyUpgradePoint={buyUpgradeWithFx}
            onSellUpgradePoint={sellUpgradeWithFx}
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
        onPlayCard={playCardWithFx}
        onPlayMultipleAttacks={playMultipleWithFx}
        onUpgradeCard={onUpgradeCard}
        onSellCard={sellCardWithFx}
        onBuyCard={buyCardWithFx}
        onBuySpecialCard={buySpecialWithFx}
        onChooseMirrorTarget={onChooseMirrorTarget}
        onChooseEliminationReward={onChooseEliminationReward}
        onBeginUse={onBeginUse}
      />
    </>
  );
}
