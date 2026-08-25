/**
 * Table screen — felt shell + card-first UX (Lot 12).
 * Same intents/payloads as V1; zero rule logic. docs/agent/frontend.md · tech spec v2 §6.
 */

import {
  isSharedAttackCardId,
  SHARED_CARD_IDS,
  getKit,
  type ActionResolvedPayload,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type ResolveSubChoicePayload,
  type SubChoiceRequiredPayload,
} from '@card-battle/shared';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { IconButton } from '../design/components/icon-button';
import { seatColorHex, seatIndexOf, seatZoneStyle } from '../design/seat-colors';
import { markHowToPlaySeen } from '../help/help-storage';
import { ActionLogPanel } from '../action-log/action-log-panel';
import {
  measureBuyCardFlyout,
  measureBuySpecialFlyout,
  measurePlayFlyout,
  measureSellCardFlyout,
  measureTargetingCue,
} from '../fx/play-flyout';
import {
  incomingTargetingYouIds,
  newIncomingThreats,
} from '../fx/incoming-threat-diff';
import { THREAT_FX_TTL_MS } from '../fx/motion-timing';
import { TableFxProvider } from '../fx/table-fx-context';
import { useTableFx } from '../fx/table-fx-hooks';
import { threatToneFor } from '../fx/threat-tone';
import type {
  ActionRejectPayload,
  PlayCardOptions,
} from '../net/use-room-connection';
import { HowToPlayDialog } from './how-to-play-dialog';
import { IllegalActionDialog } from './illegal-action-dialog';
import { ILLEGAL_ACTION_COPY } from './illegal-action-copy';
import { CardActions, type TableDialog } from './table/card-actions';
import { ACTIVE_SHIELD_INSTANCE_ID } from './table/active-display';
import { EconomyBar } from './table/economy-bar';
import { ForfeitFlagIcon } from './table/forfeit-flag-icon';
import { KitInspectDialog } from './table/kit-inspect-dialog';
import { OpponentRevealDialog } from './table/opponent-reveal-dialog';
import { OpponentZone } from './table/opponent-zone';
import { PendingQueue } from './table/pending-queue';
import { PrivateZone } from './table/private-zone';
import { ShopDialog } from './table/shop-dialog';
import { CLIENT_SUB_CHOICE_MS, SubChoiceHost } from './table/sub-choice';
import { cardPlayNeedsConsume, cardPlayNeedsTarget } from './table/table-helpers';
import {
  FELT_QUEUE_TITLE,
  FORFEIT_ARIA_LABEL,
  HOW_TO_PLAY_ARIA_LABEL,
  LEAVE_TABLE_ARIA_LABEL,
  RETURN_HOME_ARIA_LABEL,
  SKIP_TUTORIAL_ARIA_LABEL,
} from './table/table-copy';
import {
  tableFlagAriaLabel,
  tableFlagIntent,
  type TableFlagIntent,
} from './table/table-flag-intent';
import { TableLeaveConfirm } from './table/table-leave-confirm';
import { TableShell } from './table/table-shell';
import { Timers } from './table/timers';
import { TutorialCoach } from './table/tutorial-coach';
import {
  resolveTutorialCoach,
  tutorialCardActionSpotlight,
  tutorialCoachTitle,
  tutorialEconomySpotlight,
  tutorialHighlightAt,
  tutorialPortraitSpotlight,
  tutorialSendAllowed,
  tutorialSpotlightInstanceIds,
  TUTORIAL_IDLE_MS,
  type TutorialSendIntent,
} from './table/tutorial-coach-copy';
import { YourTurnFlash } from './table/your-turn-flash';

export interface TableScreenProps {
  view: PlayingStateView;
  /** Illegal-action reject for modal (L39-02); null when none. */
  actionReject: ActionRejectPayload | null;
  onDismissActionReject: () => void;
  statusLabel: string;
  nowMs: number;
  deadlineMs: number | null;
  lastActionResolved: ActionResolvedPayload | null;
  subChoice: SubChoiceRequiredPayload | null;
  onDraw: () => void;
  onPlayCard: (instanceId: string, options?: PlayCardOptions) => void;
  onPlayMultipleAttacks: (
    attacks: readonly { instanceId: string; targetPlayerId: string }[],
  ) => void;
  onResolveSubChoice: (payload: ResolveSubChoicePayload) => void;
  onBuyCard: (cardId: (typeof SHARED_CARD_IDS)[number]) => void;
  onSellCard: (instanceId: string) => void;
  onUpgradeCard: (instanceId: string) => void;
  onBuyUpgradePoint: () => void;
  onBuySpecialCard: () => void;
  onSellUpgradePoint: () => void;
  onLeave: () => void;
  /** Alive flag Forfeit — send FORFEIT, keep the socket (L43-06). */
  onForfeit: () => void;
  onDeactivatePersistent?: (effectId: string) => void;
  onActivateDuplication?: () => void;
  /**
   * Finished board (PROTOCOL 24): lock all intents; keep inspect / log / Shop browse.
   */
  readOnly?: boolean;
  /** Reopen game-over stats when `readOnly`. */
  onShowStats?: () => void;
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
  actionReject,
  onDismissActionReject,
  statusLabel,
  nowMs,
  deadlineMs,
  lastActionResolved,
  subChoice,
  onDraw,
  onPlayCard,
  onPlayMultipleAttacks,
  onResolveSubChoice,
  onBuyCard,
  onSellCard,
  onUpgradeCard,
  onBuyUpgradePoint,
  onBuySpecialCard,
  onSellUpgradePoint,
  onLeave,
  onForfeit,
  onDeactivatePersistent,
  onActivateDuplication,
  readOnly = false,
  onShowStats,
}: TableScreenProps): ReactElement {
  const { enqueue } = useTableFx();
  const [dialog, setDialog] = useState<TableDialog>(null);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState<Exclude<TableFlagIntent, 'hidden'> | null>(
    null,
  );
  const [inspectKitId, setInspectKitId] = useState<KitId | null>(null);
  const [inspectOpponentId, setInspectOpponentId] = useState<string | null>(null);
  const [tutorialIdleIndex, setTutorialIdleIndex] = useState<number | null>(null);
  const [tutorialIllegalIndex, setTutorialIllegalIndex] = useState<number | null>(null);

  const findOwnCard = (instanceId: string): CardInstance | undefined =>
    view.self.hand.find((c) => c.instanceId === instanceId) ??
    view.self.specialCards.find((c) => c.instanceId === instanceId);

  const allowTutorialSend = (intent: TutorialSendIntent): boolean => {
    if (view.playKind !== 'tutorial') {
      return true;
    }
    const index = view.tutorialIndex;
    if (index === null || !tutorialSendAllowed(index, intent)) {
      setTutorialIllegalIndex(index);
      return false;
    }
    setTutorialIllegalIndex(null);
    return true;
  };

  const playCardWithFx = (instanceId: string, options?: PlayCardOptions): void => {
    const card = findOwnCard(instanceId);
    if (view.playKind === 'tutorial') {
      if (card === undefined) {
        setTutorialIllegalIndex(view.tutorialIndex);
        return;
      }
      if (
        !allowTutorialSend({
          kind: 'playCard',
          cardId: card.cardId,
          isUpgraded: card.isUpgraded,
        })
      ) {
        return;
      }
    }
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
    if (!allowTutorialSend({ kind: 'playMultipleAttacks' })) {
      return;
    }
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
    if (!allowTutorialSend({ kind: 'draw' })) {
      return;
    }
    // Points Δ → ResourceIcon enqueues log ↔ token chips (avoid double flyout).
    onDraw();
  };

  const buyUpgradeWithFx = (): void => {
    if (!allowTutorialSend({ kind: 'buyUpgradePoint' })) {
      return;
    }
    onBuyUpgradePoint();
  };

  const sellUpgradeWithFx = (): void => {
    if (!allowTutorialSend({ kind: 'sellUpgradePoint' })) {
      return;
    }
    onSellUpgradePoint();
  };

  const buyCardWithFx = (cardId: (typeof SHARED_CARD_IDS)[number]): void => {
    if (!allowTutorialSend({ kind: 'buyCard', cardId })) {
      return;
    }
    onBuyCard(cardId);
    const measured = measureBuyCardFlyout(cardId);
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const buySpecialWithFx = (): void => {
    if (!allowTutorialSend({ kind: 'buySpecialCard' })) {
      return;
    }
    onBuySpecialCard();
    const measured = measureBuySpecialFlyout();
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const sellCardWithFx = (instanceId: string): void => {
    const card = findOwnCard(instanceId);
    if (view.playKind === 'tutorial') {
      if (card === undefined) {
        setTutorialIllegalIndex(view.tutorialIndex);
        return;
      }
      if (!allowTutorialSend({ kind: 'sellCard', cardId: card.cardId })) {
        return;
      }
    }
    onSellCard(instanceId);
    if (card === undefined) {
      return;
    }
    const measured = measureSellCardFlyout(instanceId, card.cardId, card.isUpgraded);
    if (measured !== null) {
      enqueue({ kind: 'playFlyout', ...measured });
    }
  };

  const upgradeCardGuarded = (instanceId: string): void => {
    const card = findOwnCard(instanceId);
    if (view.playKind === 'tutorial') {
      if (card === undefined) {
        setTutorialIllegalIndex(view.tutorialIndex);
        return;
      }
      if (!allowTutorialSend({ kind: 'upgradeCard', cardId: card.cardId })) {
        return;
      }
    }
    onUpgradeCard(instanceId);
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
    if (subChoice?.kind !== 'elimination-reward') {
      lastRewardElimId.current = null;
      return;
    }
    if (lastRewardElimId.current === subChoice.eliminationId) {
      return;
    }
    lastRewardElimId.current = subChoice.eliminationId;
    enqueue({
      kind: 'rewardPulse',
      eliminationId: subChoice.eliminationId,
    });
  }, [subChoice, enqueue]);

  /** Incoming threat FX on queue (not resolve); seed first paint without flash (L39-05). */
  const seenIncomingIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const current = incomingTargetingYouIds(view.pendingEffects, view.you);
    const seen = seenIncomingIdsRef.current;
    if (seen === null) {
      seenIncomingIdsRef.current = current;
      return;
    }
    const fresh = newIncomingThreats(seen, view.pendingEffects, view.you);
    seenIncomingIdsRef.current = current;
    if (fresh.length === 0) {
      return;
    }
    const expiresAt = Date.now() + THREAT_FX_TTL_MS;
    for (const effect of fresh) {
      const tone = threatToneFor(effect.cardId);
      enqueue({ kind: 'threatOutline', tone, expiresAt });
      const measured = measureTargetingCue(effect.sourcePlayerId, view.you);
      if (measured !== null) {
        enqueue({
          kind: 'targetingCue',
          fromPlayerId: effect.sourcePlayerId,
          toPlayerId: view.you,
          tone,
          from: measured.from,
          to: measured.to,
          expiresAt,
        });
      }
    }
  }, [view.pendingEffects, view.you, enqueue]);

  const mirrorHighlightIds =
    subChoice?.kind === 'mirror' ? subChoice.eligibleEffectIds : [];

  const isMyTurn = view.currentTurnPlayerId === view.you;
  const selfPublic = view.players.find((player) => player.isYou);
  const povSeat = seatIndexOf(view, view.you);
  const dockStyle =
    povSeat !== null
      ? seatZoneStyle(povSeat, {
          intensity: 'fill',
          active: isMyTurn,
        })
      : undefined;
  const selfEliminated = selfPublic?.isEliminated === true;
  const flagIntent = tableFlagIntent({
    readOnly,
    selfEliminated,
    playKind: view.playKind,
  });
  const flagAria = tableFlagAriaLabel(flagIntent, {
    forfeit: FORFEIT_ARIA_LABEL,
    leaveTable: LEAVE_TABLE_ARIA_LABEL,
    returnHome: RETURN_HOME_ARIA_LABEL,
    skipTutorial: SKIP_TUTORIAL_ARIA_LABEL,
  });
  const actionsLocked = readOnly || subChoice !== null || selfEliminated;
  const tutorialIndex = view.playKind === 'tutorial' ? view.tutorialIndex : null;
  const tutorialHighlight =
    tutorialIndex !== null ? tutorialHighlightAt(tutorialIndex) : null;
  const tutorialCoach =
    tutorialIndex !== null ? resolveTutorialCoach(tutorialIndex) : undefined;
  const shopOpen = dialog?.kind === 'shop';
  const economySpotlight = tutorialEconomySpotlight(tutorialHighlight, shopOpen);
  const cardActionSpotlight = tutorialCardActionSpotlight(tutorialHighlight);
  const spotlightIds = tutorialSpotlightInstanceIds(tutorialHighlight, [
    ...view.self.hand,
    ...view.self.specialCards,
  ]);
  const highlightPortrait = tutorialPortraitSpotlight(tutorialHighlight);
  const followCoachCopy = ILLEGAL_ACTION_COPY['tutorial-follow-coach'];
  const tutorialIdle = tutorialIdleIndex !== null && tutorialIdleIndex === tutorialIndex;
  const tutorialIllegalHint =
    tutorialIllegalIndex !== null && tutorialIllegalIndex === tutorialIndex;
  const coachTitle = tutorialIllegalHint
    ? (followCoachCopy.title ?? 'Tutorial step')
    : tutorialCoach !== undefined
      ? tutorialCoachTitle(tutorialCoach, tutorialIdle)
      : undefined;
  const coachBody = tutorialIllegalHint ? followCoachCopy.body : tutorialCoach?.body;

  useEffect(() => {
    if (
      view.playKind !== 'tutorial' ||
      !isMyTurn ||
      readOnly ||
      selfEliminated ||
      view.tutorialIndex === null
    ) {
      return;
    }
    const index = view.tutorialIndex;
    const handle = window.setTimeout(() => {
      setTutorialIdleIndex(index);
    }, TUTORIAL_IDLE_MS);
    return () => {
      window.clearTimeout(handle);
    };
  }, [view.playKind, view.tutorialIndex, isMyTurn, readOnly, selfEliminated]);
  const kit = getKit(view.self.kitId);
  const drawValue = kit.startingResources.draw;
  const allowsMultiAttack = kit.traits.allowsMultipleAttacksPerTurn;
  const attackCards = view.self.hand.filter((card) => isSharedAttackCardId(card.cardId));
  const activePlayer = view.players.find(
    (player) => player.id === view.currentTurnPlayerId,
  );
  const blockStatusLabel =
    activePlayer === undefined
      ? undefined
      : activePlayer.blockTurnsRemaining > 0
        ? `Block chain · ${String(activePlayer.blockTurnsRemaining)} turn${activePlayer.blockTurnsRemaining === 1 ? '' : 's'} left`
        : activePlayer.blockAttacksForbidden
          ? 'Block · attacks banned this turn'
          : undefined;
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

  const inspectOpponent = opponents.find((entry) => entry.id === inspectOpponentId);
  const inspectReveal =
    inspectOpponent?.eliminationReveal !== undefined
      ? {
          mode: 'elimination' as const,
          kitId: inspectOpponent.eliminationReveal.kitId,
          hand: inspectOpponent.eliminationReveal.hand,
          specialCards: inspectOpponent.eliminationReveal.specialCards,
          lives: inspectOpponent.eliminationReveal.lives,
          points: inspectOpponent.eliminationReveal.points,
          upgradePoints: inspectOpponent.eliminationReveal.upgradePoints,
          shield: inspectOpponent.eliminationReveal.shield,
        }
      : inspectOpponent?.spied !== undefined
        ? {
            mode: 'spy' as const,
            kitId: inspectOpponent.spied.kitId,
            hand: inspectOpponent.spied.hand,
            specialCards: inspectOpponent.spied.specialCards,
            lives: inspectOpponent.spied.lives,
            points: inspectOpponent.spied.points,
            upgradePoints: inspectOpponent.spied.upgradePoints,
            shield: inspectOpponent.spied.shield,
            resourcesSnapshot: inspectOpponent.spied.resourcesSnapshot,
          }
        : null;

  const subChoiceSecondsLeft =
    subChoice === null
      ? null
      : Math.max(0, Math.ceil((subChoice.deadlineMs - nowMs) / 1000));

  const subChoiceLabel =
    subChoice === null
      ? undefined
      : `Choice: ${subChoiceSecondsLeft ?? '—'}s`;

  const subChoiceProgressRatio =
    subChoice === null
      ? null
      : Math.max(
          0,
          Math.min(1, (subChoice.deadlineMs - nowMs) / CLIENT_SUB_CHOICE_MS),
        );

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
    if (
      !allowTutorialSend({
        kind: 'playCard',
        cardId: instance.cardId,
        isUpgraded: instance.isUpgraded,
      })
    ) {
      return;
    }
    if (instance.cardId === 'regeneration') {
      setDialog({ kind: 'quantity', instance });
      return;
    }
    if (cardPlayNeedsConsume(instance.cardId)) {
      setDialog({ kind: 'consume', instance });
      return;
    }
    if (cardPlayNeedsTarget(instance.cardId, instance.isUpgraded)) {
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
      <YourTurnFlash
        isMyTurn={isMyTurn && !readOnly && !selfEliminated}
        {...(povSeat !== null ? { seatColor: seatColorHex(povSeat) } : {})}
      />
      <TableShell
        {...(dockStyle !== undefined ? { dockStyle } : {})}
        turn={
          <div className="flex items-stretch gap-1 p-1 sm:p-1.5">
            <IconButton
              aria-label={HOW_TO_PLAY_ARIA_LABEL}
              onClick={() => {
                setHowToPlayOpen(true);
              }}
            >
              ?
            </IconButton>
            <div className="min-w-0 flex-1">
              <Timers
                gameCode={view.gameCode}
                statusLabel={statusLabel}
                activeNickname={activePlayer?.nickname ?? '—'}
                activePlayerId={view.currentTurnPlayerId}
                view={view}
                isMyTurn={isMyTurn}
                timerLabel={timerLabel}
                progressRatio={progressRatio}
                {...(subChoiceLabel !== undefined ? { subChoiceLabel } : {})}
                subChoiceProgressRatio={subChoiceProgressRatio}
                {...(blockStatusLabel !== undefined ? { blockStatusLabel } : {})}
              />
            </div>
            {flagAria !== null && flagIntent !== 'hidden' ? (
              <IconButton
                aria-label={flagAria}
                onClick={() => {
                  setLeaveConfirm(flagIntent);
                }}
              >
                <ForfeitFlagIcon />
              </IconButton>
            ) : null}
          </div>
        }
        prompts={
          readOnly ? (
            <section className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-2">
              <h2 className="text-sm font-semibold">Game over</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Inspect the final board. Open Stats for the recap, or use the flag to
                return home.
              </p>
            </section>
          ) : selfEliminated ? (
            <section className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-2">
              <h2 className="text-sm font-semibold">Eliminated</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                You are a spectator. Actions are locked while rewards (if any) resolve.
              </p>
            </section>
          ) : tutorialIndex !== null &&
            coachTitle !== undefined &&
            coachBody !== undefined ? (
            <TutorialCoach
              index={tutorialIndex}
              title={coachTitle}
              body={coachBody}
              onSkip={() => {
                setLeaveConfirm('skipTutorial');
              }}
            />
          ) : null
        }
        opponentSeats={opponents.map((player) => (
          <OpponentZone
            key={player.id}
            view={view}
            player={player}
            onInspectActive={(effectId) => {
              onInspectActive(player.id, effectId);
            }}
            {...(player.eliminationReveal !== undefined || player.spied !== undefined
              ? {
                  onInspectReveal: () => {
                    setInspectKitId(null);
                    setInspectOpponentId(player.id);
                  },
                }
              : {})}
            {...(highlightPortrait ? { highlightPortrait: true } : {})}
          />
        ))}
        pending={
          <PendingQueue
            view={view}
            effects={othersPending}
            title={FELT_QUEUE_TITLE}
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
            isMyTurn={isMyTurn}
            actionsLocked={actionsLocked}
            onInspectKit={() => {
              setInspectKitId(view.self.kitId);
            }}
            onSelectOwnCard={onSelectOwnCard}
            onSelectActive={(effectId) => {
              onInspectActive(view.you, effectId);
            }}
            {...(onDeactivatePersistent !== undefined
              ? {
                  onDeactivatePersistent: (effectId: string) => {
                    if (!allowTutorialSend({ kind: 'other' })) {
                      return;
                    }
                    onDeactivatePersistent(effectId);
                  },
                }
              : {})}
            {...(onActivateDuplication !== undefined
              ? {
                  onActivateDuplication: () => {
                    if (!allowTutorialSend({ kind: 'other' })) {
                      return;
                    }
                    onActivateDuplication();
                  },
                }
              : {})}
            {...(spotlightIds.length > 0 ? { highlightedInstanceIds: spotlightIds } : {})}
          />
        }
        economy={
          <EconomyBar
            isMyTurn={isMyTurn}
            actionsLocked={actionsLocked}
            drawValue={drawValue}
            onDraw={drawWithFx}
            onOpenShop={() => {
              setDialog({ kind: 'shop' });
            }}
            {...(economySpotlight !== undefined ? { spotlight: economySpotlight } : {})}
            {...(readOnly && onShowStats !== undefined ? { onShowStats } : {})}
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

      {inspectOpponent !== undefined && inspectReveal !== null && (
        <OpponentRevealDialog
          open
          nickname={inspectOpponent.nickname}
          mode={inspectReveal.mode}
          kitId={inspectReveal.kitId}
          hand={inspectReveal.hand}
          specialCards={inspectReveal.specialCards}
          {...(inspectReveal.lives !== undefined ? { lives: inspectReveal.lives } : {})}
          {...(inspectReveal.points !== undefined ? { points: inspectReveal.points } : {})}
          {...(inspectReveal.upgradePoints !== undefined
            ? { upgradePoints: inspectReveal.upgradePoints }
            : {})}
          {...(inspectReveal.shield !== undefined ? { shield: inspectReveal.shield } : {})}
          {...(inspectReveal.mode === 'spy' && inspectReveal.resourcesSnapshot !== undefined
            ? { resourcesSnapshot: inspectReveal.resourcesSnapshot }
            : {})}
          onClose={() => {
            setInspectOpponentId(null);
          }}
          onInspectCard={(instanceId) => {
            setInspectOpponentId(null);
            onInspectSpyCard(inspectOpponent.id, instanceId);
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
        onPlayCard={playCardWithFx}
        onPlayMultipleAttacks={playMultipleWithFx}
        onUpgradeCard={upgradeCardGuarded}
        onSellCard={sellCardWithFx}
        onBeginUse={onBeginUse}
        {...(cardActionSpotlight !== undefined ? { tutorialAction: cardActionSpotlight } : {})}
      />

      <ShopDialog
        open={dialog?.kind === 'shop'}
        view={view}
        isMyTurn={isMyTurn}
        actionsLocked={actionsLocked}
        onClose={() => {
          setDialog(null);
        }}
        onBuyUpgradePoint={buyUpgradeWithFx}
        onSellUpgradePoint={sellUpgradeWithFx}
        onBuyCard={buyCardWithFx}
        onBuySpecialCard={buySpecialWithFx}
        {...(tutorialHighlight !== null ? { tutorialHighlight } : {})}
      />

      {subChoice !== null && (
        <SubChoiceHost
          subChoice={subChoice}
          view={view}
          opponents={opponents}
          nowMs={nowMs}
          onResolve={onResolveSubChoice}
        />
      )}

      <IllegalActionDialog
        reject={actionReject}
        onClose={onDismissActionReject}
      />

      <HowToPlayDialog
        open={howToPlayOpen}
        onClose={(reason) => {
          if (reason === 'skip' || reason === 'got-it') {
            markHowToPlaySeen();
          }
          setHowToPlayOpen(false);
        }}
      />

      <TableLeaveConfirm
        intent={leaveConfirm}
        onStay={() => {
          setLeaveConfirm(null);
        }}
        onConfirm={() => {
          const intent = leaveConfirm;
          setLeaveConfirm(null);
          if (intent === 'forfeit') {
            onForfeit();
            return;
          }
          onLeave();
        }}
      />
    </>
  );
}
