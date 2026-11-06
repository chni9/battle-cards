/**
 * The arena's FX triggers — technical spec v7 §4.1, §6.12, §8.1, §8.3, Q63; Lot 14.
 *
 * Moved out of the V2 `screens/table.tsx` (L74-17, deleted in L75-10): the V7 arena calls this
 * hook. It needs `TableFxProvider` (`useTableFx` throws without it). Every decision is pure in
 * `view-model/fx-triggers.ts`; this module measures and enqueues.
 *
 * - The resolution flash, once per effect and outcome (V2; not seeded).
 * - The elimination beat, seeded on mount from the log, so a reconnect or the finished board
 *   replays none (Q63).
 * - Public-log chips and card ghosts, in the V2 order, then the live legs the log did not explain
 *   (L51-13, L51-15, L51-16); a mount replays no log history and reduced motion flies nothing.
 * - The reward pulse on the dock, once per reward prompt, and the incoming threat outline and
 *   source-seat cue, after a silent first paint (L39-05, L53-07).
 * - `ownIntent`: the POV's own play, sell and buy flights, fired after the send. An intent never
 *   awaits FX (Lot 14).
 */

import type { ActionResolvedPayload, PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  eliminationBeatKeys,
  logFxPlan,
  newEliminationBeats,
  ownIntentFxSteps,
  resolutionFlashKey,
  unseenLogEntries,
  type OwnIntentFx,
} from '../view-model/fx-triggers';
import { newIncomingThreats, incomingTargetingYouIds } from '../view-model/incoming-threat-diff';
import { collectLiveResourceSnaps, type OpponentLiveResources } from '../view-model/opponent-seat-resources';
import type { DirectedTokenChip } from '../view-model/opponent-token-chips';
import { threatToneFor } from '../view-model/threat-tone';
import { pointFlyoutCount, THREAT_FX_TTL_MS, TOKEN_FLYOUT_DURATION_S, TOKEN_STAGGER_MS } from './motion-timing';
import {
  measureBuyCardFlyout,
  measureBuySpecialFlyout,
  measureDeckCardFlyout,
  measureDirectedTokenFlyout,
  measurePlayCardGhost,
  measureSellCardFlyout,
  measureTargetingCue,
} from './play-flyout';
import { emitResourceFlowFlash } from './resource-flow-flash';
import { useTableFx, type TableFxInput } from './table-fx-hooks';
import { skipResourceIconFlyout } from './token-flyout-skip';

export interface TableFxTriggerInput {
  readonly view: PlayingStateView;
  readonly lastActionResolved: ActionResolvedPayload | null;
  readonly subChoice: SubChoiceRequiredPayload | null;
}

export interface TableFxTriggers {
  /** Own-intent flights, fired after the send (Lot 14: an intent never awaits FX). */
  readonly ownIntent: (fx: OwnIntentFx) => void;
}

function enqueueDirectedTokenChips(
  enqueue: (event: TableFxInput) => void,
  chips: readonly DirectedTokenChip[],
  you: string,
): void {
  let seq = 0;
  const tryChip = (chip: DirectedTokenChip, startSeq: number): number | null => {
    let nextSeq = startSeq;
    const count = pointFlyoutCount(chip.kind, chip.count);
    for (let i = 0; i < count; i++) {
      const measured = measureDirectedTokenFlyout(chip.kind, chip.from, chip.to, i);
      if (measured === null) {
        return null;
      }
      const delayMs = nextSeq * TOKEN_STAGGER_MS;
      enqueue({
        kind: 'tokenFlyout',
        ...measured,
        delayMs,
        expiresAt: Date.now() + delayMs + TOKEN_FLYOUT_DURATION_S * 1000 + 80,
      });
      nextSeq += 1;
    }
    return nextSeq + 1;
  };
  const land = (chip: DirectedTokenChip, startSeq: number): number | null => {
    const nextSeq = tryChip(chip, startSeq);
    if (nextSeq === null) {
      return null;
    }
    // Skip ResourceIcon net-fly only after overlay chips actually landed (L51-16).
    skipFlyoutsForChips([chip], you);
    emitFlashesForChip(chip, you);
    return nextSeq;
  };
  const failed: DirectedTokenChip[] = [];
  for (const chip of chips) {
    const nextSeq = land(chip, seq);
    if (nextSeq === null) {
      failed.push(chip);
      continue;
    }
    seq = nextSeq;
  }
  if (failed.length === 0) {
    return;
  }
  const retry = (remaining: readonly DirectedTokenChip[], attempts: number): void => {
    if (attempts > 2) {
      return;
    }
    const still: DirectedTokenChip[] = [];
    for (const chip of remaining) {
      const nextSeq = land(chip, seq);
      if (nextSeq === null) {
        still.push(chip);
        continue;
      }
      seq = nextSeq;
    }
    if (still.length > 0) {
      window.requestAnimationFrame(() => {
        retry(still, attempts + 1);
      });
    }
  };
  window.requestAnimationFrame(() => {
    retry(failed, 0);
  });
}

function skipFlyoutsForChips(chips: readonly DirectedTokenChip[], you: string): void {
  for (const chip of chips) {
    if (chip.from !== 'log') {
      skipResourceIconFlyout(flyoutSkipId(chip.from.playerId, you), chip.kind);
    }
    if (chip.to !== 'log') {
      skipResourceIconFlyout(flyoutSkipId(chip.to.playerId, you), chip.kind);
    }
  }
}

function emitFlashesForChip(chip: DirectedTokenChip, you: string): void {
  if (chip.from !== 'log') {
    emitResourceFlowFlash(flyoutSkipId(chip.from.playerId, you), chip.kind, -chip.count);
  }
  if (chip.to !== 'log') {
    emitResourceFlowFlash(flyoutSkipId(chip.to.playerId, you), chip.kind, chip.count);
  }
}

function flyoutSkipId(playerId: string, you: string): string {
  return playerId === you ? 'self' : playerId;
}

function enqueueDeckCardGhost(
  enqueue: (event: TableFxInput) => void,
  playerId: string,
  artUrl: string,
  direction: 'buy' | 'sell',
): void {
  const tryEnqueue = (): boolean => {
    const measured = measureDeckCardFlyout(playerId, artUrl, direction);
    if (measured === null) {
      return false;
    }
    enqueue({
      kind: 'tokenFlyout',
      ...measured,
      delayMs: 30,
      asCard: true,
      expiresAt: Date.now() + TOKEN_FLYOUT_DURATION_S * 1000 + 80,
    });
    return true;
  };
  if (tryEnqueue()) {
    return;
  }
  window.requestAnimationFrame(() => {
    if (tryEnqueue()) {
      return;
    }
    window.requestAnimationFrame(() => {
      tryEnqueue();
    });
  });
}

function enqueuePlayCardGhost(
  enqueue: (event: TableFxInput) => void,
  playerId: string,
  artUrl: string,
  instanceId?: string,
  origin?: { readonly x: number; readonly y: number },
): void {
  const tryEnqueue = (): boolean => {
    const measured = measurePlayCardGhost(playerId, artUrl, instanceId, origin);
    if (measured === null) {
      return false;
    }
    enqueue({
      kind: 'tokenFlyout',
      ...measured,
      delayMs: 20,
      asCard: true,
      expiresAt: Date.now() + TOKEN_FLYOUT_DURATION_S * 1000 + 80,
    });
    return true;
  };
  if (tryEnqueue()) {
    return;
  }
  window.requestAnimationFrame(() => {
    if (tryEnqueue()) {
      return;
    }
    window.requestAnimationFrame(() => {
      tryEnqueue();
    });
  });
}

export function useTableFxTriggers({ view, lastActionResolved, subChoice }: TableFxTriggerInput): TableFxTriggers {
  const { enqueue } = useTableFx();
  const reduceMotion = useReducedMotion();

  const lastResolvedKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastActionResolved === null) {
      return;
    }
    const key = resolutionFlashKey(lastActionResolved);
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

  // Q63: the first run seeds every elimination already in the log and beats none of them.
  const seenElimKeys = useRef<ReadonlySet<string> | null>(null);
  useEffect(() => {
    const seen = seenElimKeys.current;
    if (seen === null) {
      seenElimKeys.current = eliminationBeatKeys(view.actionLog);
      return;
    }
    const beats = newEliminationBeats(seen, view.actionLog);
    seenElimKeys.current = beats.seen;
    for (const playerId of beats.playerIds) {
      enqueue({ kind: 'eliminationBeat', playerId });
    }
  }, [view.actionLog, enqueue]);

  const seenLogFlyoutKeys = useRef<ReadonlySet<string> | null>(null);
  const liveResourceSnaps = useRef<Map<string, OpponentLiveResources> | null>(null);
  useLayoutEffect(() => {
    const nextSnaps = collectLiveResourceSnaps(view.you, {
      lives: view.self.lives,
      points: view.self.points,
      upgradePoints: view.self.upgradePoints,
      shield: view.self.shield,
    }, view.players);
    const prevSnaps = liveResourceSnaps.current;
    liveResourceSnaps.current = nextSnaps;

    const seen = seenLogFlyoutKeys.current;
    if (seen === null) {
      seenLogFlyoutKeys.current = unseenLogEntries(new Set(), view.actionLog).seen;
      return;
    }
    const unseen = unseenLogEntries(seen, view.actionLog);
    seenLogFlyoutKeys.current = unseen.seen;
    if (reduceMotion === true) {
      return;
    }
    const steps = logFxPlan({
      entries: unseen.entries,
      prev: prevSnaps ?? new Map<string, OpponentLiveResources>(),
      next: nextSnaps,
      you: view.you,
      players: view.players,
      selfKitId: view.self.kitId,
    });
    for (const step of steps) {
      switch (step.kind) {
        case 'chips':
          enqueueDirectedTokenChips(enqueue, step.chips, view.you);
          break;
        case 'deck-ghost':
          enqueueDeckCardGhost(enqueue, step.ghost.playerId, step.ghost.artUrl, step.ghost.direction);
          break;
        case 'play-ghost':
          enqueuePlayCardGhost(enqueue, step.ghost.playerId, step.ghost.artUrl);
          break;
      }
    }
  }, [view.actionLog, view.you, view.players, view.self.kitId, view.self.lives, view.self.points, view.self.upgradePoints, view.self.shield, enqueue, reduceMotion]);

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

  const ownIntent = (fx: OwnIntentFx): void => {
    for (const step of ownIntentFxSteps(fx, view.self)) {
      switch (step.kind) {
        case 'play-ghost':
          if (reduceMotion !== true) {
            enqueuePlayCardGhost(enqueue, view.you, step.artUrl, step.instanceId, step.origin);
          }
          break;
        case 'buy-card-flyout': {
          // Enqueued under reduced motion too, as in V2: `FlyoutImage` then draws nothing.
          const measured = measureBuyCardFlyout(step.cardId);
          if (measured !== null) {
            enqueue({ kind: 'playFlyout', ...measured });
          }
          break;
        }
        case 'buy-special-flyout': {
          const measured = measureBuySpecialFlyout();
          if (measured !== null) {
            enqueue({ kind: 'playFlyout', ...measured });
          }
          break;
        }
        case 'sell-flyout': {
          const measured = measureSellCardFlyout(step.instanceId, step.cardId, step.isUpgraded, step.origin);
          if (measured !== null) {
            enqueue({ kind: 'playFlyout', ...measured });
          }
          break;
        }
      }
    }
  };

  return { ownIntent };
}
