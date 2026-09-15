/**
 * Room-owned wall-clock think time — L59-04.
 *
 * Not on `GameState` (simulations stay seed-pure). Pause accrues the open
 * segment without writing totals so disconnect + later action cannot
 * double-count the same wall-clock. Credit on action / timeout / auto-draw
 * (those all go through `applyTurnResult`) and leftover close at game over.
 */

export class ThinkTimeAccumulator {
  private readonly totals = new Map<string, number>();
  private openPlayerId: string | null = null;
  private openStartedAtMs: number | null = null;
  private openAccruedMs = 0;

  /**
   * Open or resume a think segment. A running clock for the same seat is left
   * alone (timer refresh). A different open seat is credited first.
   */
  start(playerId: string, nowMs: number): void {
    if (this.openPlayerId === playerId && this.openStartedAtMs === null) {
      this.openStartedAtMs = nowMs;
      return;
    }

    if (this.openPlayerId === playerId && this.openStartedAtMs !== null) {
      return;
    }

    if (this.openPlayerId !== null) {
      this.creditAndClose(nowMs);
    }

    this.openPlayerId = playerId;
    this.openAccruedMs = 0;
    this.openStartedAtMs = nowMs;
  }

  /** Freeze the open segment for `playerId`. Does not write totals. */
  pause(playerId: string, nowMs: number): void {
    if (this.openPlayerId !== playerId || this.openStartedAtMs === null) {
      return;
    }

    this.openAccruedMs += Math.max(0, nowMs - this.openStartedAtMs);
    this.openStartedAtMs = null;
  }

  /** Add the open segment to totals and close it. No-op when nothing is open. */
  creditAndClose(nowMs: number): void {
    if (this.openPlayerId === null) {
      return;
    }

    let elapsed = this.openAccruedMs;

    if (this.openStartedAtMs !== null) {
      elapsed += Math.max(0, nowMs - this.openStartedAtMs);
    }

    const playerId = this.openPlayerId;
    this.totals.set(playerId, (this.totals.get(playerId) ?? 0) + elapsed);
    this.openPlayerId = null;
    this.openStartedAtMs = null;
    this.openAccruedMs = 0;
  }

  snapshot(): ReadonlyMap<string, number> {
    return new Map(this.totals);
  }

  /** Next `createInitialState` only — not the first Play again. */
  clear(): void {
    this.totals.clear();
    this.openPlayerId = null;
    this.openStartedAtMs = null;
    this.openAccruedMs = 0;
  }
}
