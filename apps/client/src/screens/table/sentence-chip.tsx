/**
 * Ticking Sentence next to the caster — designer 2026-09-20 playtest.
 * Remaining owner turns sit in red under the card. Not card-lives.
 */

import type { PendingSentenceView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';

export interface SentenceChipProps {
  remainingOwnerTurns: number;
  isUpgraded: boolean;
  compact?: boolean;
}

export function SentenceChip({
  remainingOwnerTurns,
  isUpgraded,
  compact = false,
}: SentenceChipProps): ReactElement {
  return (
    <span data-sentence-chip className="inline-flex flex-col items-center">
      <Card
        instance={{
          instanceId: 'sentence-pending',
          cardId: 'sentence',
          isUpgraded,
        }}
        detail="thumb"
        activated
        className={compact ? 'w-6 !p-0 sm:w-7' : 'w-7 !p-0.5 sm:w-8'}
      />
      <span className="mt-px font-sans text-[9px] font-semibold tabular-nums text-cta-red">
        {remainingOwnerTurns}
      </span>
    </span>
  );
}

export interface SentenceChipsForSeatProps {
  playerId: string;
  pendingSentences: readonly PendingSentenceView[];
  compact?: boolean;
}

export function SentenceChipsForSeat({
  playerId,
  pendingSentences,
  compact = false,
}: SentenceChipsForSeatProps): ReactElement | null {
  const mine = pendingSentences.filter((entry) => entry.sourcePlayerId === playerId);
  if (mine.length === 0) {
    return null;
  }

  return (
    <div data-zone="sentence-chips" className="flex items-start gap-0.5">
      {mine.map((entry, index) => (
        <SentenceChip
          key={`${entry.sourcePlayerId}-${String(index)}`}
          remainingOwnerTurns={entry.remainingOwnerTurns}
          isUpgraded={entry.isUpgraded}
          compact={compact}
        />
      ))}
    </div>
  );
}
