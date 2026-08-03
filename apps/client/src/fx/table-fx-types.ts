/**
 * Presentational Table FX kinds — Lot 14.
 * Never invent game info; payloads are ids/URLs the client already has.
 */

export interface DomRectLite {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ResolutionOutcome = 'applied' | 'cancelled' | 'immune';

export type TableFxEvent =
  | {
      id: string;
      kind: 'playFlyout';
      artUrl: string;
      from: DomRectLite;
      to: DomRectLite;
      expiresAt: number;
    }
  | {
      id: string;
      kind: 'tokenFlyout';
      artUrl: string;
      from: DomRectLite;
      to: DomRectLite;
      /** Delay before this chip starts moving (multi-token stagger). */
      delayMs?: number;
      expiresAt: number;
    }
  | {
      id: string;
      kind: 'resolutionFlash';
      outcome: ResolutionOutcome;
      effectId: string;
      expiresAt: number;
    }
  | {
      id: string;
      kind: 'eliminationBeat';
      playerId: string;
      expiresAt: number;
    }
  | {
      id: string;
      kind: 'rewardPulse';
      eliminationId: string;
      expiresAt: number;
    };

export { FX_TTL_MS } from './motion-timing';
