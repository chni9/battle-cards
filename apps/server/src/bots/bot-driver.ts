/**
 * Room-side bot lifecycle — technical spec v3 §4.2, §4.6, §4.7 (L16-06).
 * Bot reasons attached for L17-05 / #V3-2.
 * Policy resolved via registry (L32-02) — room/sim parity.
 *
 * Enumerate → view-only decide → difficulty noise → performBotAction.
 * Sub-choices answered inline; every turn entered via setTimeout.
 */

import type {
  ActionLogEntryView,
  BotDecisionReason,
  BotDifficulty,
  GameState,
  KitId,
  PlayingStateView,
  RewardChoice,
} from '@card-battle/shared';

import { listLegalActions } from '../engine/turn/list-legal-actions';
import { listAvailableRewardCards } from '../engine/turn/elimination-rewards';
import type { TurnAction } from '../engine/turn/perform-action';
import { createRng } from '../engine/rng';
import { readBotThinkMs } from './bot-think-ms';
import { applyDifficultyNoiseWithMeta } from './difficulty-noise';
import { getDefaultPolicy, getPolicy } from './registry';

export interface BotDriverHost {
  isBotSeat(playerId: string): boolean;
  getGameState(): GameState | null;
  isGameOver(): boolean;
  getPlayingView(botId: string): PlayingStateView | null;
  getActionLog(): readonly ActionLogEntryView[];
  getBotDifficulty(botId: string): BotDifficulty;
  /** Policy id for this seat; default `heuristic-v4` when omitted. */
  getBotPolicyId?(botId: string): string;
  /** Full action path through the room's performTurnAction + routing. */
  performBotAction(botId: string, action: TurnAction, reason?: BotDecisionReason): void;
  /** Unconditionally legal draw — fallback on throw / rejection. */
  performBotDraw(botId: string, reason?: BotDecisionReason): void;
  completeBotMirror(
    botId: string,
    pendingEffectId: string,
    newTargetPlayerId: string,
    reason?: BotDecisionReason,
  ): void;
  completeBotSteal(botId: string, instanceId: string, reason?: BotDecisionReason): void;
  completeBotReward(
    botId: string,
    eliminationId: string,
    choices: readonly [RewardChoice, RewardChoice],
    reason?: BotDecisionReason,
  ): void;
  /** Expire reward sub-choice when the bot policy throws or picks illegally. */
  failBotReward(botId: string): void;
  completeBotReanimationKit(
    botId: string,
    kitId: KitId,
    reason?: BotDecisionReason,
  ): void;
  failBotReanimationKit(botId: string): void;
}

export class BotDriver {
  private readonly thinkMs: number;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private readonly host: BotDriverHost,
    thinkMs: number = readBotThinkMs(),
  ) {
    this.thinkMs = thinkMs;
  }

  /** Enter a bot turn via setTimeout — never call decideAndAct synchronously (§4.7). */
  scheduleTurn(botId: string): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.decideAndAct(botId);
    }, this.thinkMs);

    this.timers.add(timer);
  }

  /** Inline Mirror answer — no `subChoiceRequired` timer. */
  handleMirrorChoice(botId: string): void {
    const state = this.host.getGameState();

    if (state === null || this.host.isGameOver()) {
      return;
    }

    const view = this.host.getPlayingView(botId);

    if (view === null) {
      this.host.performBotDraw(botId, { code: 'policy-fallback' });
      return;
    }

    const rng = createRng(`${state.seed}:bot:${botId}:mirror:${state.turnSequence}`);
    const pick = this.policyFor(botId).pickMirrorRedirect(
      view,
      rng,
      state.mirrorChoice?.eligibleEffectIds,
    );

    if (pick === null) {
      this.host.performBotDraw(botId, { code: 'policy-fallback' });
      return;
    }

    try {
      this.host.completeBotMirror(
        botId,
        pick.pendingEffectId,
        pick.newTargetPlayerId,
        pick.reason,
      );
    } catch {
      this.host.performBotDraw(botId, { code: 'policy-fallback' });
    }
  }

  /** Inline Card Thief steal-pick — no `subChoiceRequired` timer. */
  handleStealChoice(botId: string): void {
    const state = this.host.getGameState();
    const choice = state?.stealChoice;

    if (state === null || choice === null || choice === undefined || this.host.isGameOver()) {
      return;
    }

    if (choice.playerId !== botId || choice.eligibleInstanceIds.length === 0) {
      this.host.performBotDraw(botId, { code: 'policy-fallback' });
      return;
    }

    const view = this.host.getPlayingView(botId);
    const rng = createRng(`${state.seed}:bot:${botId}:steal:${state.turnSequence}`);
    const instanceId =
      view === null
        ? rng.pick(choice.eligibleInstanceIds)
        : this.policyFor(botId).pickStealInstanceId(view, choice.eligibleInstanceIds, rng);

    try {
      this.host.completeBotSteal(botId, instanceId, { code: 'policy-fallback' });
    } catch {
      this.host.performBotDraw(botId, { code: 'policy-fallback' });
    }
  }

  /** Inline reward answer — no `subChoiceRequired` timer. */
  handleRewardChoice(botId: string): void {
    const state = this.host.getGameState();
    const choice = state?.rewardChoice;

    if (state === null || choice === null || choice === undefined || this.host.isGameOver()) {
      return;
    }

    if (choice.eliminatorPlayerId !== botId) {
      return;
    }

    const view = this.host.getPlayingView(botId);

    if (view === null) {
      this.host.failBotReward(botId);
      return;
    }

    try {
      const available = listAvailableRewardCards(state, choice.eliminatedPlayerId);
      const rng = createRng(`${state.seed}:bot:${botId}:reward:${state.turnSequence}`);
      const picks = this.policyFor(botId).pickEliminationRewards(
        view,
        available,
        state.lifeLimit,
        rng,
      );
      this.host.completeBotReward(botId, choice.eliminationId, picks.choices, picks.reason);
    } catch {
      // Do not draw during a pending reward — that leaves rewardChoice set and freezes the room.
      this.host.failBotReward(botId);
    }
  }

  /** Inline upgraded Reanimation kit pick — no `subChoiceRequired` timer (L26-02). */
  handleReanimationKitChoice(botId: string): void {
    const state = this.host.getGameState();
    const choice = state?.subChoice;

    if (
      state === null ||
      choice?.kind !== 'reanimation-kit' ||
      this.host.isGameOver()
    ) {
      return;
    }

    if (choice.playerId !== botId || choice.eligibleKitIds.length === 0) {
      this.host.failBotReanimationKit(botId);
      return;
    }

    const rng = createRng(`${state.seed}:bot:${botId}:reanim-kit:${state.turnSequence}`);
    const kitId = this.policyFor(botId).pickReanimationKitId(choice.eligibleKitIds, rng);

    try {
      this.host.completeBotReanimationKit(botId, kitId, { code: 'policy-fallback' });
    } catch {
      this.host.failBotReanimationKit(botId);
    }
  }

  clear(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    this.timers.clear();
  }

  private policyFor(botId: string) {
    const id = this.host.getBotPolicyId?.(botId);
    return id === undefined ? getDefaultPolicy() : getPolicy(id);
  }

  private decideAndAct(botId: string): void {
    if (this.host.isGameOver() || !this.host.isBotSeat(botId)) {
      return;
    }

    const state = this.host.getGameState();

    if (state?.currentTurnPlayerId !== botId) {
      return;
    }

    try {
      const view = this.host.getPlayingView(botId);

      if (view === null) {
        this.host.performBotDraw(botId, { code: 'policy-fallback' });
        return;
      }

      const actions = listLegalActions(state, botId);

      if (actions.length === 0) {
        this.host.performBotDraw(botId, { code: 'policy-fallback' });
        return;
      }

      const rng = createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`);
      const decision = this.policyFor(botId).decide(view, actions, rng, {
        actionLog: this.host.getActionLog(),
      });
      const difficulty = this.host.getBotDifficulty(botId);
      const noisy = applyDifficultyNoiseWithMeta(
        decision.action,
        actions,
        difficulty,
        rng,
      );
      const reason: BotDecisionReason = noisy.substituted
        ? { code: 'noise-substitute' }
        : decision.reason;
      this.host.performBotAction(botId, noisy.action, reason);
    } catch {
      this.host.performBotDraw(botId, { code: 'policy-fallback' });
    }
  }
}
