/**
 * Room-side bot lifecycle — technical spec v3 §4.2, §4.6, §4.7 (L15-04 stub).
 *
 * Lot 15 stub: always draw; Mirror/reward via first-legal / 2×lives.
 * L16-06 replaces decideAndAct with the heuristic policy; this module stays.
 */

import type { GameState } from '@card-battle/shared';

import { readBotThinkMs } from './bot-think-ms';
import { pickStubMirrorChoice, stubRewardChoices } from './stub-policy';

export interface BotDriverHost {
  isBotSeat(playerId: string): boolean;
  getGameState(): GameState | null;
  isGameOver(): boolean;
  /** Unconditionally legal draw through the room's perform path. */
  performBotDraw(botId: string): void;
  completeBotMirror(
    botId: string,
    pendingEffectId: string,
    newTargetPlayerId: string,
  ): void;
  completeBotReward(
    botId: string,
    eliminationId: string,
    choices: ReturnType<typeof stubRewardChoices>,
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

    const pick = pickStubMirrorChoice(state);

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

    try {
      this.host.completeBotReward(botId, choice.eliminationId, stubRewardChoices());
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
      this.host.performBotDraw(botId);
    } catch {
      this.host.performBotDraw(botId);
    }
  }
}
