/**
 * Multiplayer max^n value vectors — technical spec v5 §6.2 / #V5-8 (L35-03).
 * Paranoid (everyone targets me) is rejected.
 */

export function livingSeatIds(
  players: readonly { readonly id: string; readonly isEliminated: boolean }[],
): readonly string[] {
  return players.filter((player) => !player.isEliminated).map((player) => player.id);
}

export function ownerIndex(livingIds: readonly string[], ownerPlayerId: string): number {
  const index = livingIds.indexOf(ownerPlayerId);

  if (index < 0) {
    throw new Error(`owner ${ownerPlayerId} not in living seats`);
  }

  return index;
}

/** Mean of backed-up win-prob for one seat. */
export function meanValue(valueSums: Float64Array, visits: number, seatIndex: number): number {
  if (visits <= 0) {
    return 0;
  }

  return (valueSums[seatIndex] ?? 0) / visits;
}

export function backupValueVector(
  valueSums: Float64Array,
  values: Float64Array,
): void {
  const length = Math.min(valueSums.length, values.length);

  for (let index = 0; index < length; index += 1) {
    valueSums[index] = (valueSums[index] ?? 0) + (values[index] ?? 0);
  }
}
