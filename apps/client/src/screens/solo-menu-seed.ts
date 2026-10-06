/**
 * Solo Play again reopens the solo menu (designer 2026-09-28).
 * One human seat is a solo table. Two humans stay on the rematch lobby.
 */

import {
  BOT_DIFFICULTIES,
  SOLO_OPPONENT_COUNTS,
  type BotDifficulty,
  type KitId,
  type LobbyKitSelection,
  type LobbyRules,
  type PlayKind,
  type SoloOpponentCount,
} from '@card-battle/shared';

export interface SoloMenuSeed {
  opponentCount: SoloOpponentCount;
  difficulty: BotDifficulty;
  kitSelection: LobbyKitSelection;
  lobbyRules: LobbyRules;
}

export interface SoloMenuSeedPlayer {
  isYou: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
}

export function soloMenuSeed(input: {
  playKind: PlayKind;
  isSpectator?: true;
  players: readonly SoloMenuSeedPlayer[];
  kitId: KitId;
  lobbyRules: LobbyRules;
}): SoloMenuSeed | null {
  if (input.playKind !== 'classic' || input.isSpectator === true) {
    return null;
  }

  const humans = input.players.filter((player) => !player.isBot);
  if (humans.length !== 1 || humans[0]?.isYou !== true) {
    return null;
  }

  const bots = input.players.filter((player) => player.isBot);
  if (!isSoloOpponentCount(bots.length)) {
    return null;
  }

  const difficulties = bots.map((bot) => bot.botDifficulty);
  const first = difficulties[0];
  const difficulty =
    first !== undefined &&
    difficulties.every((entry) => entry === first) &&
    isBotDifficulty(first)
      ? first
      : 'normal';

  return {
    opponentCount: bots.length,
    difficulty,
    kitSelection: input.kitId,
    lobbyRules: input.lobbyRules,
  };
}

function isSoloOpponentCount(value: number): value is SoloOpponentCount {
  return (SOLO_OPPONENT_COUNTS as readonly number[]).includes(value);
}

function isBotDifficulty(value: BotDifficulty | undefined): value is BotDifficulty {
  return value !== undefined && (BOT_DIFFICULTIES as readonly string[]).includes(value);
}
