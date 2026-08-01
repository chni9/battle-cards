/**
 * Pending effects strip — L12-04.
 * Same info as V1 queue: card, source, target, queuedAt.
 */

import type { PendingEffectView, PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { nicknameOf } from './table-helpers';

export interface PendingQueueProps {
  view: PlayingStateView;
  effects: readonly PendingEffectView[];
}

export function PendingQueue({ view, effects }: PendingQueueProps): ReactElement {
  return (
    <section data-zone="pending-queue">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-soft">
        Pending effects
      </h2>
      {effects.length === 0 ? (
        <p className="mt-1 text-sm text-slate-soft/90">None in flight</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {effects.map((effect) => (
            <li
              key={effect.id}
              data-pending-id={effect.id}
              className="flex min-w-[10rem] flex-col rounded-[length:var(--radius-card)] border border-slate-soft/50 bg-surface-raised px-2.5 py-1.5 text-ink shadow-sm"
            >
              <span className="text-sm font-semibold">{effect.cardId}</span>
              <span className="text-[11px] text-ink-muted">
                {nicknameOf(view, effect.sourcePlayerId)}
                {' → '}
                {nicknameOf(view, effect.targetPlayerId)}
              </span>
              <span className="text-[10px] tabular-nums text-ink-muted">
                queued #{effect.queuedAt}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
