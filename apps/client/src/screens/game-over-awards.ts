/**
 * Rank public recap numbers for the Game over gallery — L60-05.
 * Client has zero rule logic: no exportLog parse, no matchStats reconstruction.
 */

import type { GameRecapPlayerView, GameRecapView, KitId } from '@card-battle/shared';

export const HIDDEN_KIT_LABEL = 'Hidden kit';

export type AwardValueKind = 'points' | 'lives' | 'upgrade' | 'count' | 'time';
export type AwardRank = 'max' | 'min';

export const GAME_OVER_AWARD_IDS = [
  'most-points-spent',
  'most-lives-lost',
  'least-lives-lost',
  'most-lives-gained',
  'most-points-gained',
  'most-upgrade-used',
  'most-kills',
  'most-specials',
  'most-cards-sold',
  'most-cards-bought',
  'slowest',
  'fastest',
  'most-damage',
  'fewest-attacks',
  'most-draws',
  'most-attacks',
  'most-cards-played',
] as const;

export type GameOverAwardId = (typeof GAME_OVER_AWARD_IDS)[number];

type RecapStatField =
  | 'pointsSpent'
  | 'livesLost'
  | 'livesGained'
  | 'pointsGained'
  | 'upgradePointsSpent'
  | 'kills'
  | 'specialsPlayedCount'
  | 'sellCardCount'
  | 'buyCardCount'
  | 'thinkTimeMs'
  | 'damageDealt'
  | 'attacksPlayedCount'
  | 'drawCount'
  | 'cardsPlayedCount';

interface AwardSpec {
  id: GameOverAwardId;
  title: string;
  field: RecapStatField;
  rank: AwardRank;
  valueKind: AwardValueKind;
  humansOnly?: true;
}

const AWARD_SPECS: readonly AwardSpec[] = [
  {
    id: 'most-points-spent',
    title: 'Most points spent',
    field: 'pointsSpent',
    rank: 'max',
    valueKind: 'points',
  },
  {
    id: 'most-lives-lost',
    title: 'Most lives lost',
    field: 'livesLost',
    rank: 'max',
    valueKind: 'lives',
  },
  {
    id: 'least-lives-lost',
    title: 'Least lives lost',
    field: 'livesLost',
    rank: 'min',
    valueKind: 'lives',
  },
  {
    id: 'most-lives-gained',
    title: 'Most lives gained',
    field: 'livesGained',
    rank: 'max',
    valueKind: 'lives',
  },
  {
    id: 'most-points-gained',
    title: 'Most points gained',
    field: 'pointsGained',
    rank: 'max',
    valueKind: 'points',
  },
  {
    id: 'most-upgrade-used',
    title: 'Most upgrade points used',
    field: 'upgradePointsSpent',
    rank: 'max',
    valueKind: 'upgrade',
  },
  {
    id: 'most-kills',
    title: 'Most players killed',
    field: 'kills',
    rank: 'max',
    valueKind: 'count',
  },
  {
    id: 'most-specials',
    title: 'Most specials used',
    field: 'specialsPlayedCount',
    rank: 'max',
    valueKind: 'count',
  },
  {
    id: 'most-cards-sold',
    title: 'Most cards sold',
    field: 'sellCardCount',
    rank: 'max',
    valueKind: 'count',
  },
  {
    id: 'most-cards-bought',
    title: 'Most cards bought',
    field: 'buyCardCount',
    rank: 'max',
    valueKind: 'count',
  },
  {
    id: 'slowest',
    title: 'Slowest',
    field: 'thinkTimeMs',
    rank: 'max',
    valueKind: 'time',
    humansOnly: true,
  },
  {
    id: 'fastest',
    title: 'Fastest',
    field: 'thinkTimeMs',
    rank: 'min',
    valueKind: 'time',
    humansOnly: true,
  },
  {
    id: 'most-damage',
    title: 'Most damage dealt',
    field: 'damageDealt',
    rank: 'max',
    valueKind: 'lives',
  },
  {
    id: 'fewest-attacks',
    title: 'Fewest attacks',
    field: 'attacksPlayedCount',
    rank: 'min',
    valueKind: 'count',
  },
  {
    id: 'most-draws',
    title: 'Most draws',
    field: 'drawCount',
    rank: 'max',
    valueKind: 'count',
  },
  {
    id: 'most-attacks',
    title: 'Most attacks played',
    field: 'attacksPlayedCount',
    rank: 'max',
    valueKind: 'count',
  },
  {
    id: 'most-cards-played',
    title: 'Most cards played',
    field: 'cardsPlayedCount',
    rank: 'max',
    valueKind: 'count',
  },
];

export interface AwardWinner {
  playerId: string;
  isBot: boolean;
  kitId?: KitId;
  value: number;
}

export interface GameOverAward {
  id: GameOverAwardId;
  title: string;
  rank: AwardRank;
  valueKind: AwardValueKind;
  winners: readonly AwardWinner[];
}

export function pickGameOverAwards(recap: GameRecapView): GameOverAward[] {
  const awards: GameOverAward[] = [];

  for (const spec of AWARD_SPECS) {
    const award = pickOneAward(recap.players, spec);

    if (award !== null) {
      awards.push(award);
    }
  }

  return awards;
}

export function formatThinkTimeMs(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;

  if (totalSeconds < 60) {
    const rounded = Math.round(totalSeconds * 10) / 10;
    return Number.isInteger(rounded) ? `${String(rounded)}s` : `${rounded.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${String(minutes)}m ${String(seconds)}s`;
}

export function formatAwardValue(kind: AwardValueKind, value: number): string {
  return kind === 'time' ? formatThinkTimeMs(value) : String(value);
}

function pickOneAward(
  players: readonly GameRecapPlayerView[],
  spec: AwardSpec,
): GameOverAward | null {
  const seats = spec.humansOnly === true ? players.filter((row) => !row.isBot) : [...players];

  if (spec.humansOnly === true && seats.length < 2) {
    return null;
  }

  if (seats.length === 0) {
    return null;
  }

  const values = seats.map((row) => recapStat(row, spec.field));

  if (values.every((value) => value === 0)) {
    return null;
  }

  const extreme = spec.rank === 'max' ? Math.max(...values) : Math.min(...values);
  const winners: AwardWinner[] = [];

  for (const row of seats) {
    if (recapStat(row, spec.field) !== extreme) {
      continue;
    }

    const winner: AwardWinner = {
      playerId: row.playerId,
      isBot: row.isBot,
      value: extreme,
    };

    if (row.kitId !== undefined) {
      winner.kitId = row.kitId;
    }

    winners.push(winner);
  }

  return {
    id: spec.id,
    title: spec.title,
    rank: spec.rank,
    valueKind: spec.valueKind,
    winners,
  };
}

function recapStat(row: GameRecapPlayerView, field: RecapStatField): number {
  switch (field) {
    case 'pointsSpent':
      return row.pointsSpent;
    case 'livesLost':
      return row.livesLost;
    case 'livesGained':
      return row.livesGained;
    case 'pointsGained':
      return row.pointsGained;
    case 'upgradePointsSpent':
      return row.upgradePointsSpent;
    case 'kills':
      return row.kills;
    case 'specialsPlayedCount':
      return row.specialsPlayedCount;
    case 'sellCardCount':
      return row.sellCardCount;
    case 'buyCardCount':
      return row.buyCardCount;
    case 'thinkTimeMs':
      return row.thinkTimeMs;
    case 'damageDealt':
      return row.damageDealt;
    case 'attacksPlayedCount':
      return row.attacksPlayedCount;
    case 'drawCount':
      return row.drawCount;
    case 'cardsPlayedCount':
      return row.cardsPlayedCount;
    default: {
      const _exhaustive: never = field;
      void _exhaustive;
      return 0;
    }
  }
}
