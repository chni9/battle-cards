/**
 * Room-side bot lifecycle — technical spec v3 §4.2, §4.6, §4.7 (L16-06).
 *
 * Enumerate → view-only decide → difficulty noise → performBotAction.
 * Sub-choices answered inline; every turn entered via setTimeout.
 */

import type { BotDifficulty, GameState, PlayingStateView, RewardChoice } from '@card-battle/shared';

import { listLegalActions } from '../engine/turn/list-legal-actions';
import { listAvailableRewardCards } from '../engine/turn/elimination-rewards';
import type { TurnAction } from '../engine/turn/perform-action';
import { createRng } from '../engine/rng';
import { readBotThinkMs } from './bot-think-ms';
import { applyDifficultyNoise } from './difficulty-noise';
import { decide, pickEliminationRewards, pickMirrorRedirect } from './heuristic-policy';

export interface BotDriverHost {
  isBotSeat(playerId: string): boolean;
  getGameState(): GameState | null;
  isGameOver(): boolean;
  getPlayingView(botId: string): PlayingStateView | null;
  getBotDifficulty(botId: string): BotDifficulty;
  /** Full action path through the room's performTurnAction + routing. */
  performBotAction(botId: string, action: TurnAction): void;
  /** Unconditionally legal draw — fallback on throw / rejection. */
  performBotDraw(botId: string): void;
  completeBotMirror(
    botId: string,
    pendingEffectId: string,
    newTargetPlayerId: string,
  ): void;
  completeBotReward(
    botId: string,
    eliminationId: string,
    choices: readonly [RewardChoice, RewardChoice],
  ): void;
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

  /** Inline Mirror answer — no MIRROR_CHOICE_REQUIRED timer. */
  handleMirrorChoice(botId: string): void {
    const state = this.host.getGameState();

    if (state === null || this.host.isGameOver()) {
      return;
    }

    const view = this.host.getPlayingView(botId);

    if (view === null) {
      this.host.performBotDraw(botId);
      return;
    }

    const rng = createRng(`${state.seed}:bot:${botId}:mirror:${state.turnSequence}`);
    const pick = pickMirrorRedirect(view, rng);

    if (pick === null) {
      this.host.performBotDraw(botId);
      return;
    }

    try {
      this.host.completeBotMirror(botId, pick.pendingEffectId, pick.newTargetPlayerId);
    } catch {
      this.host.performBotDraw(botId);
    }
  }

  /** Inline reward answer — no REWARD_CHOICE_REQUIRED timer. */
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
      this.host.performBotDraw(botId);
      return;
    }

    try {
      const available = listAvailableRewardCards(state, choice.eliminatedPlayerId);
      const rng = createRng(`${state.seed}:bot:${botId}:reward:${state.turnSequence}`);
      const picks = pickEliminationRewards(view, available, state.lifeLimit, rng);
      this.host.completeBotReward(botId, choice.eliminationId, picks);
    } catch {
      this.host.performBotDraw(botId);
    }
  }

  clear(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    this.timers.clear();
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
        this.host.performBotDraw(botId);
        return;
      }

      const actions = listLegalActions(state, botId);

      if (actions.length === 0) {
        this.host.performBotDraw(botId);
        return;
      }

      const rng = createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`);
      const top = decide(view, actions, rng);
      const difficulty = this.host.getBotDifficulty(botId);
      const chosen = applyDifficultyNoise(top, actions, difficulty, rng);
      this.host.performBotAction(botId, chosen);
    } catch {
      this.host.performBotDraw(botId);
    }
  }
}
