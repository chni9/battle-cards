/**
 * Presentational Table FX kinds — Lot 14.
 * Never invent game info; payloads are ids/URLs the client already has.
 */

import type { ActionResolutionOutcome } from '@card-battle/shared';

export interface DomRectLite {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ResolutionOutcome = ActionResolutionOutcome;

/** Red attack-like vs orange non-attack Incoming threat (L39-05). */
export type ThreatTone = 'attack' | 'effect';

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
    }
  | {
      id: string;
      kind: 'threatOutline';
      tone: ThreatTone;
      expiresAt: number;
    }
  | {
      id: string;
      kind: 'targetingCue';
      fromPlayerId: string;
      toPlayerId: string;
      tone: ThreatTone;
      from: DomRectLite;
      to: DomRectLite;
      expiresAt: number;
    };

export { FX_TTL_MS, THREAT_FX_TTL_MS, THREAT_OUTLINE_DURATION_S } from './motion-timing';
